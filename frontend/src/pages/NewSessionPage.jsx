import { Link, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import Logo from '../components/Logo';
import BackButton from '../components/BackButton';
import GameSelector from '../components/GameSelector';
import { useToast } from '../context/ToastContext';

export default function NewSessionPage() {



    const [isProcessing, setIsProcessing] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [status, setStatus] = useState('');
    const [teaser, setTeaser] = useState(''); // New state for fun engagement
    const [videoUrl, setVideoUrl] = useState('');
    const [userName, setUserName] = useState('Guest');
    const [showGame, setShowGame] = useState(false);
    const navigate = useNavigate();
    const { showToast } = useToast();
    const fileInputRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    useEffect(() => {
        const fetchUser = async () => {
            if (window.electronAPI) {
                const result = await window.electronAPI.getSessionUser();
                if (result.success) setUserName(result.user.name);
            }
        };
        fetchUser();

        // Listen for stop signal from hover toolbar
        if (window.electronAPI && window.electronAPI.onTriggerStopRecording) {
            window.electronAPI.onTriggerStopRecording(() => {
                // We must use a ref or check state if needed, but handleStopRecording uses refs internally so it should work
                handleStopRecording();
            });
        }

        // Listen for pause signal from hover toolbar
        if (window.electronAPI && window.electronAPI.onTriggerPauseRecording) {
            window.electronAPI.onTriggerPauseRecording((event, isPaused) => {
                if (mediaRecorderRef.current) {
                    if (isPaused && mediaRecorderRef.current.state === 'recording') {
                        mediaRecorderRef.current.pause();
                        setStatus('Recording paused...');
                    } else if (!isPaused && mediaRecorderRef.current.state === 'paused') {
                        mediaRecorderRef.current.resume();
                        setStatus('Recording screen and audio...');
                    }
                }
            });
        }

        return () => {
            if (window.electronAPI) {
                if (window.electronAPI.removeTriggerStopRecordingListener) window.electronAPI.removeTriggerStopRecordingListener();
                if (window.electronAPI.removeTriggerPauseRecordingListener) window.electronAPI.removeTriggerPauseRecordingListener();
            }
        };
    }, []);

    const getInitials = (name) => {
        if (!name || name === 'Guest') return 'G';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    const handleUrlProcess = async () => {
        if (!videoUrl.trim()) return;
        setIsProcessing(true);
        setStatus('Processing link ...');
        try {
            const result = await window.electronAPI.processLink(videoUrl);
            if (result.success) {
                await processFile(result.path, result.title || "Linked Video", {
                    duration: result.duration,
                    skipNormalization: true
                });
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Link processing failed:', error);
            setStatus('Error: ' + error.message);
            setIsProcessing(false);
        }
    };

    const handleFileSelect = () => {
        fileInputRef.current.click();
    };

    const processFile = async (filePath, fileName, extraData = {}) => {
        setIsProcessing(true);
        setTeaser(''); // Reset teaser
        setStatus('Initializing analysis pipeline...');

        try {
            if (!window.electronAPI) {
                throw new Error('Electron API not available. Are you running in a browser?');
            }

            // 1. Process File
            setStatus('Optimizing media for AI...');
            console.log('🚀 Calling uploadFile with:', filePath, 'Type:', typeof filePath);

            if (typeof filePath !== 'string') {
                throw new Error('Invalid file path: expected string, received ' + typeof filePath);
            }

            let processed;
            if (extraData.skipNormalization) {
                processed = {
                    success: true,
                    path: filePath,
                    originalPath: filePath,
                    duration: extraData.duration || 0
                };
            } else {
                processed = await window.electronAPI.uploadFile(filePath);
            }

            if (!processed.success) throw new Error('Media Prep Failed: ' + processed.error);

            // 2. Start Parallel Tasks: Transcription + Analysis vs Visual Extraction
            setStatus('Transcribing and extracting visuals...');

            // Transcription and Analysis (Sequential)
            const transcriptionAndAnalysis = (async () => {
                const transcriptResult = await window.electronAPI.transcribeAudio(processed.path);
                if (!transcriptResult.success) throw new Error(transcriptResult.error);

                // FUN ENGAGEMENT: Generate a teaser while the rest of the analysis happens
                window.electronAPI.generateBrainTeaser(transcriptResult.text).then(t => {
                    if (t.success) setTeaser(t.teaser);
                });

                setStatus('Performing deep content analysis...');
                const analysisResult = await window.electronAPI.analyzeContent(transcriptResult.text);
                if (!analysisResult.success) throw new Error('Analysis Engine Failure: ' + analysisResult.error);

                return {
                    transcript: transcriptResult.text,
                    category: analysisResult.category || 'General',
                    summary: analysisResult.summary || 'Summary generation failed.'
                };
            })();

            // Visual Extraction (Parallel with Transcription)
            const visualExtraction = (async () => {
                const visualPath = processed.originalPath || processed.path;
                const ext = visualPath.split('.').pop().toLowerCase();
                const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext);

                if (isVideo) {
                    try {
                        const vResult = await window.electronAPI.extractVisuals(visualPath);
                        return vResult.success ? vResult.visuals : [];
                    } catch (vErr) {
                        console.warn('Visual extraction failed:', vErr);
                        return [];
                    }
                }
                return [];
            })();

            // Wait for both pipelines
            const [aiData, visuals] = await Promise.all([transcriptionAndAnalysis, visualExtraction]);

            const { transcript, category, summary } = aiData;

            // 6. Compression (Storage Optimization - Background)
            // Removed status to keep it transparent for user
            let finalStoragePath = filePath;
            try {
                const compressResult = await window.electronAPI.compressMedia(filePath);
                if (compressResult.success) {
                    finalStoragePath = compressResult.path;
                    console.log('📉 Media compressed for long-term storage:', finalStoragePath);
                }
            } catch (cErr) {
                console.warn('Compression failed (non-critical):', cErr);
            }

            // 7. Save Session
            setStatus('Updating meeting history...');
            const userId = await window.electronAPI.getActiveId();
            const sessionData = {
                userId: userId,
                title: fileName.replace(/\.[^/.]+$/, "") || "New Meeting",
                date: new Date().toISOString(),
                duration: processed.duration || 0,
                transcript: transcript,
                summary: summary,
                classification: category,
                visuals: visuals,
                source_type: fileName.startsWith('Live_') ? 'recording' :
                    (filePath.toLowerCase().includes('download') || filePath.includes('meeting_download_') ? 'link' : 'upload'),
                source_path: finalStoragePath // Use compressed path
            };

            if (userId) {
                const saveResult = await window.electronAPI.saveSession(sessionData);
                if (saveResult.success) {
                    sessionData.id = saveResult.sessionId;
                    console.log('✅ Session saved to history');
                } else {
                    console.error('❌ Failed to update history:', saveResult.error);
                }
            } else {
                // GUEST: Save to Local Storage
                console.log('💾 Guest User: Saving to Local Storage');
                const guestSessions = JSON.parse(localStorage.getItem('guestSessions') || '[]');
                sessionData.id = `guest_${Date.now()}`;
                // Keep only last 5 sessions for guest to avoid quota limits
                if (guestSessions.length >= 5) guestSessions.pop();
                guestSessions.unshift(sessionData); // Add to top
                localStorage.setItem('guestSessions', JSON.stringify(guestSessions));
            }

            // Reset and Navigate
            setIsProcessing(false);
            navigate('/transcript', { state: sessionData });

        } catch (error) {
            console.error('🚨 Analysis Pipeline Failure:', error);
            let userMsg = error.message;
            if (userMsg.includes('Unable to allocate') || userMsg.includes('out of memory')) {
                userMsg = "Memory Error: The file is too large for local analysis. Try a shorter clip or use a lower resolution.";
            }
            setStatus('Analysis Failed: ' + userMsg);
            setTimeout(() => {
                setIsProcessing(false);
            }, 8000);
        }
    };

    const onFileChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Use file.path if available (Electron), otherwise fallback to just the name for debugging
        const pathToSend = file.path || file.name;
        console.log('📂 File selected:', {
            name: file.name,
            path: file.path,
            type: file.type,
            pathToSend: pathToSend
        });

        await processFile(pathToSend, file.name);
    };

    const recognitionRef = useRef(null);
    const [liveTranscript, setLiveTranscript] = useState('');

    const handleStartRecording = async () => {
        try {
            setStatus('Requesting screen and audio permissions...');

            let screenStream;
            try {
                console.log('🎬 Attempting getDisplayMedia (Full Features)...');
                screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: true
                });
            } catch (err) {
                console.warn('⚠️ Full capture failed, trying video only...', err.name, err.message);
                try {
                    screenStream = await navigator.mediaDevices.getDisplayMedia({
                        video: { frameRate: { ideal: 30 } }
                    });
                } catch (err2) {
                    console.error('❌ All display capture attempts failed!', err2);
                    throw err2;
                }
            }

            console.log('🎤 Requesting mic stream...');
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const tracks = [...screenStream.getVideoTracks()];

            console.log('🔊 Merging audio tracks...');
            let audioCtx;
            try {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const dest = audioCtx.createMediaStreamDestination();

                const micSource = audioCtx.createMediaStreamSource(micStream);
                micSource.connect(dest);

                if (screenStream.getAudioTracks().length > 0) {
                    const systemSource = audioCtx.createMediaStreamSource(screenStream);
                    systemSource.connect(dest);
                }

                tracks.push(...dest.stream.getAudioTracks());
            } catch (aErr) {
                console.warn('⚠️ AudioContext failed, using mic tracks directly:', aErr);
                tracks.push(...micStream.getAudioTracks());
            }

            const combinedStream = new MediaStream(tracks);

            // Comprehensive mime-type check
            const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
            const mimeType = types.find(t => MediaRecorder.isTypeSupported(t)) || '';

            console.log('📹 MimeType found:', mimeType);
            const mediaRecorder = new MediaRecorder(combinedStream, mimeType ? { mimeType } : {});
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                console.log('⏹️ Processing recorded chunks:', audioChunksRef.current.length);
                const blob = new Blob(audioChunksRef.current, { type: mimeType || 'video/webm' });
                const buffer = await blob.arrayBuffer();
                setStatus('Saving screen recording...');

                const timestamp = Date.now();
                const saveResult = await window.electronAPI.saveTempAudio(buffer);
                if (saveResult.success) {
                    setStatus('Verifying and persisting...');
                    try {
                        const persistResult = await window.electronAPI.persistRecording(saveResult.path);
                        if (persistResult.success) {
                            await processFile(persistResult.path, `Live_ScreenRec_${timestamp}.webm`);
                        } else {
                            throw new Error(persistResult.error);
                        }
                    } catch (pErr) {
                        console.error('❌ Persistence Error:', pErr);
                        setStatus('Save failed');
                        setIsProcessing(false);
                    }
                } else {
                    setStatus('Temp save failed');
                    setIsProcessing(false);
                }

                // Cleanup
                [screenStream, micStream, combinedStream].forEach(s => s && s.getTracks().forEach(t => t.stop()));
                if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();
            };

            mediaRecorder.start();
            setIsRecording(true);

            // Show Hover Toolbar!
            if (window.electronAPI && window.electronAPI.showToolbar) {
                window.electronAPI.showToolbar();
            }

            setLiveTranscript('');
            setStatus('Recording screen and audio...');

            screenStream.getVideoTracks()[0].onended = () => {
                if (isRecording) handleStopRecording();
            };

        } catch (err) {
            console.error('❌ Recording initialization failed:', err);
            showToast(`Error: ${err.message || 'Access denied'}`, 'error');
            setIsProcessing(false);
            setStatus('');
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current) {
            if (mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            setIsRecording(false);

            // Hide Hover Toolbar!
            if (window.electronAPI && window.electronAPI.hideToolbar) {
                window.electronAPI.hideToolbar();
            }
            if (window.electronAPI && window.electronAPI.hideDrawingOverlay) {
                window.electronAPI.hideDrawingOverlay();
            }

            setIsProcessing(true);
            setStatus('Finishing recording...');
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white transition-colors duration-200 min-h-screen flex flex-col overflow-x-hidden">
            <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-[#2c4823] px-6 lg:px-10 py-4 bg-background-light dark:bg-background-dark sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <BackButton />
                    <Logo />
                </div>
                <div className="flex flex-1 justify-end gap-4 md:gap-8 items-center">
                    <div className="hidden md:flex items-center gap-6 lg:gap-9">
                        <Link to="/dashboard" className="text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white text-sm font-medium leading-normal transition-colors">Dashboard</Link>
                    </div>
                    <div className="bg-primary/20 flex items-center justify-center rounded-full size-10 text-primary font-bold border border-primary/20">
                        {getInitials(userName)}
                    </div>
                </div>
            </header>
            <main className="layout-container flex h-full grow flex-col">
                <div className="px-4 md:px-20 lg:px-40 flex flex-1 justify-center py-8">
                    <div className="layout-content-container flex flex-col max-w-[960px] flex-1 gap-8">
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2 px-4">
                                <Link to="/dashboard" className="text-slate-500 dark:text-[#9fc992] text-sm font-medium leading-normal hover:underline">Dashboard</Link>
                                <span className="text-slate-400 dark:text-[#9fc992]/50 text-sm font-medium leading-normal">/</span>
                                <span className="text-slate-900 dark:text-white text-sm font-medium leading-normal">New Session</span>
                            </div>
                            <div className="px-4 py-2">
                                <h1 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">Start New Analysis</h1>
                                <p className="text-slate-500 dark:text-[#9fc992] mt-2 text-base font-normal leading-normal">Upload your meeting recording or start capturing live audio for instant AI insights.</p>
                            </div>
                        </div>

                        {isProcessing && (
                            <div className="px-4 py-4 flex flex-col gap-4">
                                <div className="bg-primary/10 border border-primary/20 text-primary p-4 rounded-lg flex items-center gap-3 animate-pulse">
                                    <span className="material-symbols-outlined animate-spin">sync</span>
                                    <span className="font-bold">{status}</span>
                                </div>

                                {teaser && (
                                    <div className="bg-white/5 dark:bg-[#1c2e17] border border-primary/30 p-6 rounded-2xl shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                                        <div className="flex items-start gap-4">
                                            <div className="bg-primary/20 p-2 rounded-lg text-primary">
                                                <span className="material-symbols-outlined">psychology</span>
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-primary font-bold text-sm uppercase tracking-wider mb-2">While you wait: Content Teaser</h4>
                                                <p className="text-slate-700 dark:text-gray-300 italic text-lg leading-relaxed">
                                                    "{teaser}"
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex flex-col lg:flex-row gap-6 px-4">
                            <div className="flex-1 flex flex-col gap-4">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={onFileChange}
                                    className="hidden"
                                    accept="audio/*,video/*"
                                />
                                <div onClick={!isRecording ? handleFileSelect : null} className={`flex flex-col items-center justify-center gap-6 rounded-lg border-2 border-dashed border-slate-300 dark:border-[#3f6732] bg-white/5 dark:bg-[#152211]/50 hover:bg-white/10 dark:hover:bg-[#1c2e18] hover:border-primary/50 transition-all cursor-pointer px-6 py-14 group relative overflow-hidden ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                                    <div className="bg-primary/10 p-4 rounded-full text-primary group-hover:scale-110 transition-transform duration-300">
                                        <span className="material-symbols-outlined text-[40px]">cloud_upload</span>
                                    </div>
                                    <div className="flex max-w-[480px] flex-col items-center gap-2 z-10">
                                        <p className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] text-center group-hover:text-primary transition-colors">Upload Meeting Recording</p>
                                        <p className="text-slate-500 dark:text-gray-400 text-sm font-normal leading-normal text-center">Drag and drop your files here, or click to browse.</p>
                                    </div>
                                    <button disabled={isRecording} className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-6 bg-slate-900 dark:bg-[#2c4823] hover:bg-primary hover:text-slate-900 text-white text-sm font-bold leading-normal tracking-[0.015em] transition-all shadow-lg z-10">
                                        <span className="truncate">Select Files</span>
                                    </button>
                                </div>
                            </div>
                            <div className="w-full lg:w-1/3 flex flex-col gap-6">
                                <div className={`rounded-lg bg-white dark:bg-surface-dark border border-slate-200 dark:border-[#2c4823] p-6 flex flex-col items-center justify-center gap-6 text-center h-full shadow-sm relative overflow-hidden ${isRecording ? 'ring-2 ring-red-500 animate-pulse' : ''}`}>
                                    <div className={`absolute w-full h-full opacity-5 pointer-events-none ${isRecording ? 'bg-red-500' : 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent'}`}></div>
                                    <div className="flex flex-col gap-2 z-10">
                                        <h3 className="text-slate-900 dark:text-white font-bold text-lg">{isRecording ? 'Recording...' : 'Live Analysis'}</h3>
                                        <p className="text-slate-500 dark:text-gray-400 text-sm">{isRecording ? 'Capturing meeting audio' : 'Record directly from your microphone.'}</p>
                                    </div>

                                    {/* Live Transcript Display */}
                                    {isRecording && liveTranscript && (
                                        <div className="absolute inset-x-4 bottom-24 p-2 bg-black/50 backdrop-blur-sm rounded-lg text-white text-xs text-center z-20 max-h-20 overflow-hidden">
                                            {liveTranscript}
                                        </div>
                                    )}

                                    <button onClick={isRecording ? handleStopRecording : handleStartRecording} className="relative group cursor-pointer">
                                        <div className={`absolute -inset-1 ${isRecording ? 'bg-red-500' : 'bg-primary'} rounded-full blur opacity-25 group-hover:opacity-75 transition duration-500 group-hover:duration-200`}></div>
                                        <div className={`relative flex size-20 items-center justify-center rounded-full ${isRecording ? 'bg-red-500' : 'bg-primary'} text-background-dark shadow-xl hover:scale-105 transition-all active:scale-95`}>
                                            <span className="material-symbols-outlined text-[32px]">{isRecording ? 'stop' : 'mic'}</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="px-4">
                            <div className="bg-white dark:bg-[#1c2e17] rounded-xl border border-slate-200 dark:border-[#2c4823] p-6 shadow-lg">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="bg-primary/20 p-2 rounded-lg text-primary">
                                        <span className="material-symbols-outlined">link</span>
                                    </div>
                                    <div>
                                        <h3 className="text-slate-900 dark:text-white font-bold">Import from Link</h3>
                                        <p className="text-slate-500 dark:text-gray-400 text-xs">YouTube, Drive, or direct media links</p>
                                    </div>
                                </div>
                                <div className="flex flex-col md:flex-row gap-3">
                                    <input
                                        type="text"
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        value={videoUrl}
                                        onChange={(e) => setVideoUrl(e.target.value)}
                                        className="flex-1 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-[#3f6732] rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:outline-none"
                                    />
                                    <button
                                        onClick={handleUrlProcess}
                                        disabled={!videoUrl.trim() || isProcessing}
                                        className="bg-primary text-background-dark font-bold px-8 py-3 rounded-xl hover:brightness-110 disabled:opacity-50 transition-all shadow-lg"
                                    >
                                        Process Link
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Floating Play Game Button - Shows during processing */}
                {isProcessing && !showGame && (
                    <button
                        onClick={() => setShowGame(true)}
                        className="fixed bottom-8 right-8 bg-primary text-black px-6 py-3 rounded-full font-black text-sm uppercase tracking-wider shadow-2xl hover:scale-110 transition-transform flex items-center gap-2 z-50 animate-bounce shadow-[0_0_15px_rgba(70,236,19,0.5)]"
                    >
                        <span className="material-symbols-outlined">sports_esports</span>
                        Play Games
                    </button>
                )}

                {/* Game Selector Modal */}
                {showGame && <GameSelector transcript="" summary="" onClose={() => setShowGame(false)} />}
            </main>
        </div>
    );
}
