import { Link, useNavigate } from 'react-router-dom';
import { useState, useRef } from 'react';
import Logo from '../components/Logo';
import BackButton from '../components/BackButton';

export default function NewSessionPage() {



    const [isProcessing, setIsProcessing] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [status, setStatus] = useState('');
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const handleFileSelect = () => {
        fileInputRef.current.click();
    };

    const processFile = async (filePath, fileName) => {
        setIsProcessing(true);
        setStatus('Processing audio...');

        try {
            if (window.electronAPI) {
                // 1. Process Audio
                const processed = await window.electronAPI.uploadFile(filePath);
                if (!processed.success) throw new Error(processed.error);

                // 2. Transcribe
                setStatus('Transcribing (this may take a moment)...');
                const transcriptResult = await window.electronAPI.transcribeAudio(processed.path);
                if (!transcriptResult.success) throw new Error(transcriptResult.error);

                // 3. Classify
                setStatus('Classifying content...');
                const classResult = await window.electronAPI.classifyContent(transcriptResult.text);

                // 4. Summarize
                setStatus('Generating summary...');
                const summaryResult = await window.electronAPI.generateSummary(transcriptResult.text);

                // 5. Visuals
                setStatus('Extracting visuals...');
                const visualsResult = await window.electronAPI.extractVisuals(processed.path);

                // 6. Save Session
                setStatus('Saving results...');
                const userId = await window.electronAPI.getActiveId();

                const sessionData = {
                    userId: userId || 1,
                    title: fileName.replace(/\.[^/.]+$/, "") || "Live Recording",
                    date: new Date(),
                    duration: 0,
                    transcript: transcriptResult.text,
                    summary: summaryResult.summary,
                    classification: classResult.category || 'General',
                    visuals: visualsResult.frames || []
                };

                const saveResult = await window.electronAPI.saveSession(sessionData);
                if (saveResult.success) {
                    navigate('/transcript', { state: sessionData });
                } else {
                    console.error('Failed to save:', saveResult.error);
                    navigate('/transcript', { state: sessionData });
                }
            }
        } catch (error) {
            console.error('Processing failed:', error);
            setStatus('Error: ' + error.message);
            setIsProcessing(false);
        }
    };

    const onFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        await processFile(file.path, file.name);
    };

    const handleStartRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const buffer = await audioBlob.arrayBuffer();
                setStatus('Saving recording...');
                const saveResult = await window.electronAPI.saveTempAudio(buffer);
                if (saveResult.success) {
                    await processFile(saveResult.path, `Live_${Date.now()}`);
                } else {
                    setStatus('Failed to save recording');
                    setIsProcessing(false);
                }
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setStatus('Recording live audio...');
        } catch (err) {
            console.error('Mic access denied:', err);
            alert('Could not access microphone.');
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsProcessing(true);
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white transition-colors duration-200 min-h-screen flex flex-col overflow-x-hidden">
            <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-[#2c4823] px-6 lg:px-10 py-4 bg-background-light dark:bg-background-dark sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <BackButton className="lg:hidden" />
                    <Logo />
                </div>
                <div className="flex flex-1 justify-end gap-4 md:gap-8 items-center">
                    <div className="hidden md:flex items-center gap-6 lg:gap-9">
                        <Link to="/dashboard" className="text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white text-sm font-medium leading-normal transition-colors">Dashboard</Link>
                        <Link to="/guest" className="text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white text-sm font-medium leading-normal transition-colors">History</Link>
                    </div>
                    <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8 md:size-10 ring-2 ring-primary/20" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAYVxGFDbjmIemXBhHmXXocQLw1ipSmu5dicdsbN2nQoFhciZDz_UpletSlpxt9yjlkNTqVvb4KAO5iPEY-6n_dy_813KXOaYmhCztG9z9Y8ZmHj7kqnnbVSF31CIVkiS4mupuRn7qr0rMhTei_khGvBI1BtArwffNMPtWcOrx1l9rYb_JJeJIkVLSDJdItPMgGufI72j5XEAOZLlM3vRvKSczbLMrophwMzP9QUGZMf2rH1rMsvEwKUOh-L_B017kRU2fMgtoHLuis")' }}></div>
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
                            <div className="px-4 py-4">
                                <div className="bg-primary/10 border border-primary/20 text-primary p-4 rounded-lg flex items-center gap-3 animate-pulse">
                                    <span className="material-symbols-outlined animate-spin">sync</span>
                                    <span className="font-bold">{status}</span>
                                </div>
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
                                    <button onClick={isRecording ? handleStopRecording : handleStartRecording} className="relative group cursor-pointer">
                                        <div className={`absolute -inset-1 ${isRecording ? 'bg-red-500' : 'bg-primary'} rounded-full blur opacity-25 group-hover:opacity-75 transition duration-500 group-hover:duration-200`}></div>
                                        <div className={`relative flex size-20 items-center justify-center rounded-full ${isRecording ? 'bg-red-500' : 'bg-primary'} text-background-dark shadow-xl hover:scale-105 transition-all active:scale-95`}>
                                            <span className="material-symbols-outlined text-[32px]">{isRecording ? 'stop' : 'mic'}</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
