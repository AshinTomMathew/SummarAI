import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import BackButton from '../components/BackButton';

export default function TranscriptPage() {
    const location = useLocation();
    const sessionData = location.state || {
        title: "No Session Selected",
        transcript: "No transcript available.",
        summary: "No summary available.",
        classification: "N/A",
        date: new Date(),
        source_path: null
    };

    const [summary, setSummary] = useState(sessionData.summary);
    const [isTransforming, setIsTransforming] = useState(false);
    const [expandedView, setExpandedView] = useState(null); // 'summary' | 'transcript' | null
    const [copyStatus, setCopyStatus] = useState(null);

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        setCopyStatus('Copied!');
        setTimeout(() => setCopyStatus(null), 2000);
    };

    const handleTransform = async (format) => {
        if (!window.electronAPI || isTransforming) return;
        setIsTransforming(true);
        try {
            const result = await window.electronAPI.transformContent({
                text: sessionData.transcript,
                format: format
            });
            if (result.success) {
                setSummary(result.transformed);
            } else {
                alert("Transformation failed: " + result.error);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsTransforming(false);
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display overflow-hidden h-screen flex">
            <Sidebar active="/transcript" />
            <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
                <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-[#2c4823] px-6 py-4 bg-background-light dark:bg-[#152211] shrink-0 z-20">
                    <div className="flex items-center gap-4 text-slate-900 dark:text-white min-w-0">
                        <BackButton />
                        <div className="size-8 text-primary flex items-center justify-center bg-primary/10 rounded-full text-primary">
                            <span className="material-symbols-outlined text-xl">insights</span>
                        </div>
                        <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] truncate">Analysis Result</h2>
                    </div>
                    <div className="flex items-center gap-4 pl-4">
                        <div className="hidden sm:flex gap-2">
                            <Link to="/export" state={{ ...sessionData, summary }} className="flex cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-6 bg-primary text-[#152211] hover:bg-[#3cd610] transition-colors text-sm font-bold leading-normal tracking-[0.015em] shadow-[0_0_15px_rgba(70,236,19,0.3)]">
                                <span className="truncate">Share / Export</span>
                            </Link>
                            <Link to="/chat" state={sessionData} className="flex cursor-pointer items-center justify-center overflow-hidden rounded-full size-10 bg-slate-200 dark:bg-[#2c4823] text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-[#3a5e2e] transition-colors border border-white/5">
                                <span className="material-symbols-outlined text-[20px]">chat</span>
                            </Link>
                        </div>
                    </div>
                </header>

                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Media Player Section */}
                    {sessionData.source_path && (
                        <div className="px-6 py-4 bg-background-light dark:bg-[#111c0e] border-b border-white/5 shrink-0">
                            <div className="max-w-4xl mx-auto rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-black">
                                <video
                                    src={`media://${sessionData.source_path}`}
                                    controls
                                    className="w-full max-h-[240px] md:max-h-[300px]"
                                    onError={(e) => {
                                        // If video fails, try as audio
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'block';
                                    }}
                                />
                                <audio
                                    src={`media://${sessionData.source_path}`}
                                    controls
                                    className="w-full hidden bg-surface-dark px-4 py-2"
                                />
                            </div>
                        </div>
                    )}

                    <div className="px-6 py-6 shrink-0">
                        <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-2">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider border border-primary/20">
                                        <span className="size-1.5 rounded-full bg-primary animate-pulse"></span>{sessionData.classification}
                                    </span>
                                    <span className="text-slate-500 dark:text-text-muted text-sm font-medium">{new Date(sessionData.date).toLocaleDateString()}</span>
                                </div>
                                <h1 className="text-slate-900 dark:text-white tracking-tight text-2xl md:text-3xl font-bold leading-tight">{sessionData.title}</h1>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden px-6 pb-12">
                        <div className="flex flex-col lg:flex-row h-full gap-6">
                            {/* Summary & Visuals */}
                            <div className="w-full lg:w-[48%] h-full flex flex-col gap-4 overflow-y-auto pr-1 order-2 lg:order-1">
                                <div className="bg-white dark:bg-[#1c2e17] rounded-2xl border border-slate-200 dark:border-[#2c4823] shadow-lg flex flex-col">
                                    <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                                        <h3 className="text-slate-900 dark:text-white font-bold flex items-center gap-2">
                                            <span className="material-symbols-outlined text-primary fill-1">auto_awesome</span>AI Intelligence
                                        </h3>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleCopy(summary)}
                                                className="p-2 hover:bg-white/5 rounded-full text-text-muted hover:text-white transition-colors"
                                                title="Copy Summary"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">content_copy</span>
                                            </button>
                                            <button
                                                onClick={() => setExpandedView('summary')}
                                                className="p-2 hover:bg-white/5 rounded-full text-text-muted hover:text-white transition-colors"
                                                title="Expand View"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">open_in_full</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-5 flex-1 flex flex-col gap-4">
                                        <div className="relative">
                                            {isTransforming && (
                                                <div className="absolute inset-0 bg-background-dark/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg z-10 transition-all">
                                                    <div className="size-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-3"></div>
                                                    <p className="text-primary text-xs font-bold animate-pulse">Deep Thinking...</p>
                                                </div>
                                            )}
                                            <div className="text-slate-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                {summary}
                                            </div>
                                        </div>

                                        {/* Transformation Tools */}
                                        <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/5">
                                            <button
                                                onClick={() => handleTransform('points')}
                                                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white/5 hover:bg-primary hover:text-background-dark text-white/70 text-[10px] font-bold rounded-xl transition-all border border-white/5"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">format_list_bulleted</span> POINTS
                                            </button>
                                            <button
                                                onClick={() => handleTransform('mindmap')}
                                                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white/5 hover:bg-primary hover:text-background-dark text-white/70 text-[10px] font-bold rounded-xl transition-all border border-white/5"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">account_tree</span> MINDMAP
                                            </button>
                                            <button
                                                onClick={() => handleTransform('speakers')}
                                                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white/5 hover:bg-primary hover:text-background-dark text-white/70 text-[10px] font-bold rounded-xl transition-all border border-white/5"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">record_voice_over</span> SPEAKERS
                                            </button>
                                            <button
                                                onClick={() => setSummary(sessionData.summary)}
                                                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white/5 hover:bg-white/20 text-white/40 text-[10px] font-bold rounded-xl transition-all border border-white/5"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">refresh</span> RESET
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {sessionData.visuals && sessionData.visuals.length > 0 && (
                                    <div className="bg-white dark:bg-[#1c2e17] rounded-2xl border border-slate-200 dark:border-[#2c4823] p-5 shadow-lg">
                                        <h3 className="text-slate-900 dark:text-white font-bold flex items-center gap-2 mb-4">
                                            <span className="material-symbols-outlined text-primary">image</span>Visuals & Analysis
                                        </h3>
                                        <div className="flex flex-col gap-4">
                                            {sessionData.visuals.map((v, i) => (
                                                <div key={i} className="group relative rounded-lg overflow-hidden border border-slate-200 dark:border-[#2c4823] bg-slate-50 dark:bg-[#152211]">
                                                    <div className="aspect-video bg-slate-200 dark:bg-[#2c4823] flex items-center justify-center relative">
                                                        <img src={`media://${v.path}`} alt={`Frame ${i}`} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center gap-3 p-4">
                                                            <p className="text-[10px] text-white line-clamp-2 text-center">{v.text}</p>
                                                            <div className="flex gap-2">
                                                                <button onClick={() => window.open(`media://${v.path}`)} className="bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition-colors"><span className="material-symbols-outlined text-sm">visibility</span></button>
                                                                <button onClick={() => {
                                                                    const link = document.createElement('a');
                                                                    link.href = `media://${v.path}`;
                                                                    link.download = `Slide_${i}.jpg`;
                                                                    link.click();
                                                                }} className="bg-primary text-background-dark p-2 rounded-full transition-colors"><span className="material-symbols-outlined text-sm">download</span></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Transcript */}
                            <div className="w-full lg:w-[52%] h-full flex flex-col bg-white dark:bg-[#1c2e17] rounded-2xl border border-slate-200 dark:border-[#2c4823] overflow-hidden shadow-xl order-1 lg:order-2">
                                <div className="px-5 py-4 border-b border-slate-200 dark:border-[#2c4823] flex items-center justify-between bg-slate-50 dark:bg-[#152211]">
                                    <h3 className="text-slate-900 dark:text-white font-bold flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">description</span>Full Transcript
                                    </h3>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleCopy(sessionData.transcript)}
                                            className="p-2 hover:bg-white/5 rounded-full text-text-muted hover:text-white transition-colors"
                                            title="Copy Transcript"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">content_copy</span>
                                        </button>
                                        <button
                                            onClick={() => setExpandedView('transcript')}
                                            className="p-2 hover:bg-white/5 rounded-full text-text-muted hover:text-white transition-colors"
                                            title="Expand View"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">open_in_full</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                                    <div className="text-slate-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                                        {sessionData.transcript.split('\n').map((line, i) => {
                                            const speakerMatch = line.match(/^(Speaker [A-Z]:|You:)/);
                                            if (speakerMatch) {
                                                return <div key={i} className="mb-3"><span className="text-primary font-bold">{speakerMatch[0]}</span> {line.replace(speakerMatch[0], '')}</div>;
                                            }
                                            return <div key={i} className="mb-3">{line}</div>;
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status Toast */}
                {copyStatus && (
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-primary text-background-dark px-6 py-2 rounded-full font-bold text-sm shadow-2xl animate-bounce z-50">
                        {copyStatus}
                    </div>
                )}

                {/* Expanded Modal */}
                {expandedView && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-10 transition-all">
                        <div className="bg-surface-dark w-full max-w-5xl h-full rounded-[2.5rem] border border-white/10 flex flex-col overflow-hidden shadow-3xl animate-in zoom-in-95 duration-200">
                            <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between bg-[#13200f]">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-primary">
                                        {expandedView === 'summary' ? 'auto_awesome' : 'description'}
                                    </span>
                                    <h2 className="text-white text-xl font-bold uppercase tracking-widest">{expandedView === 'summary' ? 'AI Generated Intelligence' : 'Full Meeting Transcript'}</h2>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => handleCopy(expandedView === 'summary' ? summary : sessionData.transcript)}
                                        className="bg-white/5 hover:bg-primary hover:text-background-dark text-white px-6 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-sm">content_copy</span> Copy All
                                    </button>
                                    <button
                                        onClick={() => setExpandedView(null)}
                                        className="bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white size-10 rounded-full transition-all flex items-center justify-center"
                                    >
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-[#111c0e]/50">
                                <div className="text-gray-300 text-lg leading-relaxed whitespace-pre-wrap font-display max-w-4xl mx-auto">
                                    {expandedView === 'summary' ? summary : sessionData.transcript}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
