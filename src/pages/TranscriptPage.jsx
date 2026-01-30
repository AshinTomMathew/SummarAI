import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import BackButton from '../components/BackButton';
import MindMap from '../components/MindMap';
import GameSelector from '../components/GameSelector';
import { useToast } from '../context/ToastContext';

const LiveBackground = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#020402]">
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] animate-blob"></div>
        <div className="absolute top-[25%] right-[-10%] w-[45%] h-[45%] bg-primary/10 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-15%] left-[15%] w-[55%] h-[55%] bg-primary/20 rounded-full blur-[150px] animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[100px]"></div>
    </div>
);

export default function TranscriptPage() {
    const location = useLocation();
    const { showToast } = useToast();
    const sessionData = location.state || {
        title: "No Session Selected",
        transcript: "No transcript available.",
        summary: "No summary available.",
        classification: "N/A",
        date: new Date(),
        source_path: null
    };

    const [userIsGuest, setUserIsGuest] = useState(false);

    useEffect(() => {
        const checkUser = async () => {
            if (window.electronAPI) {
                const userId = await window.electronAPI.getActiveId();
                if (!userId) {
                    setUserIsGuest(true);
                }
            }
        };
        checkUser();
    }, []);

    const [summary, setSummary] = useState(sessionData.summary);
    const [isTransforming, setIsTransforming] = useState(false);
    const [expandedView, setExpandedView] = useState(null); // 'summary' | 'transcript' | 'visuals' | null
    const [showMindMap, setShowMindMap] = useState(false);
    const [showGames, setShowGames] = useState(false);
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
                showToast('Content transformed successfully!', 'success');

                // Special handling for mindmap - show visual mindmap after getting content
                if (format === 'mindmap') {
                    setShowMindMap(true);
                }
            } else {
                showToast("Transformation failed: " + result.error, 'error');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsTransforming(false);
        }
    };

    return (
        <div className="bg-[#050805] text-slate-900 dark:text-white font-display overflow-hidden h-screen flex relative">
            <LiveBackground />
            <Sidebar active="/transcript" />
            <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative z-10">
                <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-[#2c4823] px-6 py-4 bg-white/5 backdrop-blur-md shrink-0 z-20">
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
                            <button
                                onClick={() => setShowGames(true)}
                                className="flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full h-10 px-6 bg-slate-200 dark:bg-[#2c4823] text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-[#3a5e2e] transition-colors text-sm font-bold border border-white/5"
                            >
                                <span className="material-symbols-outlined text-[18px]">sports_esports</span>
                                <span className="truncate">Play Games</span>
                            </button>
                            <Link to="/chat" state={sessionData} className="flex cursor-pointer items-center justify-center overflow-hidden rounded-full size-10 bg-slate-200 dark:bg-[#2c4823] text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-[#3a5e2e] transition-colors border border-white/5">
                                <span className="material-symbols-outlined text-[20px]">chat</span>
                            </Link>
                        </div>
                    </div>
                </header>

                <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">

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

                    <div className="px-6 pb-6">
                        <div className="flex flex-col lg:flex-row gap-6">
                            {/* Summary & Visuals */}
                            <div className="w-full lg:w-[48%] flex flex-col gap-4 order-2 lg:order-1">
                                <div className="glass-card rounded-[2.5rem] p-4 shadow-2xl flex flex-col border border-white/5">
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
                                    <div className="p-6 flex-1 flex flex-col gap-6">
                                        <div className="relative group">
                                            {isTransforming && (
                                                <div className="absolute inset-0 bg-background-dark/95 backdrop-blur-md flex flex-col items-center justify-center rounded-2xl z-10 transition-all border-2 border-primary/50">
                                                    <div className="size-14 border-4 border-primary/10 border-t-primary rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(70,236,19,0.3)]"></div>
                                                    <p className="text-primary text-sm font-black tracking-[0.3em] animate-pulse">GENERATING INSIGHTS</p>
                                                    <p className="text-white/40 text-[10px] mt-2 uppercase">Our AI is re-analyzing this context...</p>
                                                </div>
                                            )}
                                            <div className="bg-slate-50 dark:bg-[#0d160b] rounded-2xl p-4 border border-slate-200 dark:border-white/5 shadow-inner">
                                                <div className="text-slate-700 dark:text-gray-200 text-xs md:text-sm leading-relaxed whitespace-pre-wrap max-h-[180px] overflow-y-auto pr-3 custom-scrollbar font-medium selection:bg-primary selection:text-black">
                                                    {summary.replace(/[#*]/g, '')}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Transformation Tools - HIGH VISIBILITY Section */}
                                        {!userIsGuest && (
                                            <div className="flex flex-col gap-4 p-4 rounded-xl bg-primary/[0.03] border border-primary/10 shadow-lg">
                                                <div className="flex items-center gap-2 px-1">
                                                    <div className="flex items-center justify-center size-5 rounded-full bg-primary/20 text-primary">
                                                        <span className="material-symbols-outlined text-[14px]">psychology</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black uppercase tracking-[0.1em] text-primary">Intelligence Toolkit</span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <button
                                                        onClick={() => handleTransform('points')}
                                                        className="flex items-center justify-center gap-2 py-2 px-3 bg-primary/15 hover:bg-primary text-primary hover:text-black text-[11px] font-black rounded-lg transition-all border border-primary/20 hover:border-primary active:scale-95 group/btn"
                                                        title="Convert to structured points"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px] group-hover/btn:scale-110 transition-transform">format_list_bulleted</span>
                                                        <span>POINTS</span>
                                                    </button>

                                                    <button
                                                        onClick={() => handleTransform('mindmap')}
                                                        className="flex items-center justify-center gap-2 py-2 px-3 bg-primary/15 hover:bg-primary text-primary hover:text-black text-[11px] font-black rounded-lg transition-all border border-primary/20 hover:border-primary active:scale-95 group/btn"
                                                        title="Generate study guide & mindmap"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px] group-hover/btn:scale-110 transition-transform">account_tree</span>
                                                        <span>MINDMAP</span>
                                                    </button>

                                                    <button
                                                        onClick={() => handleTransform('speakers')}
                                                        className="flex items-center justify-center gap-2 py-2 px-3 bg-primary/15 hover:bg-primary text-primary hover:text-black text-[11px] font-black rounded-lg transition-all border border-primary/20 hover:border-primary active:scale-95 group/btn"
                                                        title="Identify individual speakers"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px] group-hover/btn:scale-110 transition-transform">record_voice_over</span>
                                                        <span>SPEAKERS</span>
                                                    </button>

                                                    <button
                                                        onClick={() => setSummary(sessionData.summary)}
                                                        className="flex items-center justify-center gap-2 py-2 px-3 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white text-[11px] font-black rounded-lg transition-all border border-white/10 active:scale-95 group/btn"
                                                        title="Restore original summary"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px] group-hover/btn:scale-110 transition-transform">history</span>
                                                        <span>RESET</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {userIsGuest && (
                                            <div className="flex flex-col items-center justify-center p-6 border border-white/5 rounded-xl border-dashed opacity-50">
                                                <span className="material-symbols-outlined text-white/40 mb-2">lock</span>
                                                <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest text-center">Tools restricted for Guest</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* View Visuals Button - Only show if visuals exist */}
                                {sessionData.visuals && sessionData.visuals.length > 0 && (
                                    <button
                                        onClick={() => setExpandedView('visuals')}
                                        className="glass-card rounded-2xl p-4 shadow-lg flex items-center justify-between border border-white/5 hover:border-primary/30 transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                                <span className="material-symbols-outlined text-primary">collections</span>
                                            </div>
                                            <div className="flex flex-col items-start">
                                                <h3 className="text-slate-900 dark:text-white font-bold text-sm">View Extracted Frames</h3>
                                                <p className="text-xs text-text-muted">{sessionData.visuals.length} visual{sessionData.visuals.length !== 1 ? 's' : ''} captured</p>
                                            </div>
                                        </div>
                                        <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                    </button>
                                )}
                            </div>

                            {/* Transcript */}
                            <div className="w-full lg:w-[52%] flex flex-col glass-card rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl order-1 lg:order-2">
                                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
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
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar max-h-[300px]">
                                    <div className="text-slate-700 dark:text-gray-300 text-[13px] leading-relaxed whitespace-pre-wrap font-medium">
                                        {sessionData.transcript.replace(/[#*]/g, '').split('\n').map((line, i) => {
                                            const speakerMatch = line.match(/^(Speaker [A-Z]:|You:)/);
                                            if (speakerMatch) {
                                                return <div key={i} className="mb-1.5"><span className="text-primary font-bold">{speakerMatch[0]}</span> {line.replace(speakerMatch[0], '')}</div>;
                                            }
                                            return <div key={i} className="mb-1.5">{line}</div>;
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
                    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-2 md:p-4 transition-all animate-in fade-in duration-300">
                        <div className="bg-[#0f1a0b] w-full max-w-6xl h-full rounded-[3rem] border border-white/10 flex flex-col overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300 relative">

                            {/* Modal Header */}
                            <div className="px-10 py-8 border-b border-white/10 flex items-center justify-between bg-[#13200f] relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center justify-center size-12 rounded-2xl bg-primary/20 text-primary shadow-lg shadow-primary/10">
                                        <span className="material-symbols-outlined text-[28px] fill-1">
                                            {expandedView === 'summary' ? 'auto_awesome' : expandedView === 'visuals' ? 'collections' : 'description'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <h2 className="text-white text-2xl font-black uppercase tracking-[0.2em]">
                                            {expandedView === 'summary' ? 'AI Generated Intelligence' : expandedView === 'visuals' ? 'Extracted Visual Frames' : 'Full Meeting Transcript'}
                                        </h2>
                                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                                            {expandedView === 'visuals' ? `${sessionData.visuals?.length || 0} Frames • 1080p Quality` : 'Focus Mode • Deep Analysis View'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {expandedView !== 'visuals' && (
                                        <button
                                            onClick={() => handleCopy(expandedView === 'summary' ? summary : sessionData.transcript)}
                                            className="bg-white/5 hover:bg-primary hover:text-black text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 border border-white/10 hover:border-primary shadow-xl shadow-black/20 active:scale-95 group/btn"
                                        >
                                            <span className="material-symbols-outlined text-[18px] group-hover/btn:scale-110 transition-transform">content_copy</span> Copy Full Content
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setExpandedView(null)}
                                        className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white size-12 rounded-2xl transition-all flex items-center justify-center border border-red-500/20 active:scale-90"
                                    >
                                        <span className="material-symbols-outlined text-[24px]">close</span>
                                    </button>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row relative">
                                {/* Visuals Grid View */}
                                {expandedView === 'visuals' ? (
                                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative bg-[#0d160b]">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                                            {sessionData.visuals?.map((v, i) => (
                                                <div key={i} className="group relative rounded-2xl overflow-hidden border border-white/10 bg-[#152211] hover:border-primary/30 transition-all">
                                                    <div className="aspect-video bg-[#2c4823] flex items-center justify-center relative">
                                                        <img src={`media://${v.path}`} alt={`Frame ${i}`} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center gap-4 p-6">
                                                            <div className="text-center">
                                                                <p className="text-primary text-xs font-bold mb-1">Timestamp: {v.timestamp}</p>
                                                                <p className="text-white/80 text-xs line-clamp-3">{v.text}</p>
                                                            </div>
                                                            <div className="flex gap-3">
                                                                <button
                                                                    onClick={() => window.open(`media://${v.path}`)}
                                                                    className="bg-white/20 hover:bg-white/40 text-white px-4 py-2 rounded-xl transition-colors flex items-center gap-2 text-xs font-bold"
                                                                >
                                                                    <span className="material-symbols-outlined text-sm">visibility</span> View
                                                                </button>
                                                                {!userIsGuest && (
                                                                    <button
                                                                        onClick={() => {
                                                                            const link = document.createElement('a');
                                                                            link.href = `media://${v.path}`;
                                                                            link.download = `Frame_${v.timestamp.replace(':', '-')}.jpg`;
                                                                            link.click();
                                                                        }}
                                                                        className="bg-primary hover:bg-primary/80 text-black px-4 py-2 rounded-xl transition-colors flex items-center gap-2 text-xs font-bold"
                                                                    >
                                                                        <span className="material-symbols-outlined text-sm">download</span> Save
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="p-3 border-t border-white/5">
                                                        <p className="text-primary text-xs font-bold">Frame {i + 1} • {v.timestamp}</p>
                                                        <p className="text-white/40 text-[10px] mt-1 line-clamp-2">{v.text}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Text Content Area with Animated Live BG */}
                                        <div className={`flex-1 overflow-y-auto p-8 md:p-16 lg:p-20 custom-scrollbar relative ${expandedView === 'summary' ? 'lg:border-r lg:border-white/5' : ''}`}>
                                            {/* Subtle Mesh Glow Background */}
                                            <div className="absolute inset-0 bg-[#0d160b] overflow-hidden -z-10">
                                                <div className="absolute -top-[20%] -left-[10%] size-[60%] bg-primary/5 rounded-full blur-[120px] animate-pulse"></div>
                                                <div className="absolute -bottom-[10%] -right-[5%] size-[50%] bg-primary/3 rounded-full blur-[100px] animate-pulse delay-700"></div>
                                            </div>

                                            <div className="text-gray-200 text-base md:text-lg leading-[2] whitespace-pre-wrap font-medium max-w-3xl mx-auto selection:bg-primary selection:text-black relative">
                                                {(expandedView === 'summary' ? summary : sessionData.transcript).replace(/[#*]/g, '')}
                                            </div>
                                        </div>

                                        {/* Sidebar Transformation Tools (Only for Summary) */}
                                        {expandedView === 'summary' && (
                                            <div className="w-full lg:w-[360px] bg-[#0b130a] p-8 flex flex-col gap-8 border-t lg:border-t-0 border-white/5 shrink-0 relative overflow-y-auto custom-scrollbar">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="size-2 rounded-full bg-primary animate-ping"></div>
                                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Live Toolkit</span>
                                                    </div>
                                                    <h3 className="text-white text-lg font-black leading-tight">Re-analyze Context</h3>
                                                    <p className="text-white/40 text-[10px] font-bold uppercase leading-relaxed">Instantly transform this summary into a different perspective.</p>
                                                </div>

                                                <div className="flex flex-col gap-4">
                                                    <button
                                                        onClick={() => handleTransform('points')}
                                                        className="flex items-center justify-between gap-2.5 py-4 px-5 bg-primary/10 hover:bg-primary text-primary hover:text-black text-[12px] font-black rounded-2xl transition-all border border-primary/20 hover:border-primary shadow-lg shadow-black/20 group/btn"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className="material-symbols-outlined text-[22px] group-hover/btn:scale-110 transition-transform">format_list_bulleted</span>
                                                            <span>POINTS</span>
                                                        </div>
                                                        <span className="material-symbols-outlined text-[16px] opacity-0 group-hover/btn:opacity-100 -translate-x-2 group-hover/btn:translate-x-0 transition-all">chevron_right</span>
                                                    </button>

                                                    <button
                                                        onClick={() => handleTransform('mindmap')}
                                                        className="flex items-center justify-between gap-2.5 py-4 px-5 bg-primary/10 hover:bg-primary text-primary hover:text-black text-[12px] font-black rounded-2xl transition-all border border-primary/20 hover:border-primary shadow-lg shadow-black/20 group/btn"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className="material-symbols-outlined text-[22px] group-hover/btn:scale-110 transition-transform">account_tree</span>
                                                            <span>MINDMAP</span>
                                                        </div>
                                                        <span className="material-symbols-outlined text-[16px] opacity-0 group-hover/btn:opacity-100 -translate-x-2 group-hover/btn:translate-x-0 transition-all">chevron_right</span>
                                                    </button>

                                                    <button
                                                        onClick={() => handleTransform('speakers')}
                                                        className="flex items-center justify-between gap-2.5 py-4 px-5 bg-primary/10 hover:bg-primary text-primary hover:text-black text-[12px] font-black rounded-2xl transition-all border border-primary/20 hover:border-primary shadow-lg shadow-black/20 group/btn"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className="material-symbols-outlined text-[22px] group-hover/btn:scale-110 transition-transform">record_voice_over</span>
                                                            <span>SPEAKERS</span>
                                                        </div>
                                                        <span className="material-symbols-outlined text-[16px] opacity-0 group-hover/btn:opacity-100 -translate-x-2 group-hover/btn:translate-x-0 transition-all">chevron_right</span>
                                                    </button>

                                                    <div className="h-[1px] bg-white/5 my-2"></div>

                                                    <button
                                                        onClick={() => setSummary(sessionData.summary)}
                                                        className="flex items-center justify-center gap-2.5 py-4 px-5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-[12px] font-black rounded-2xl transition-all border border-white/10"
                                                    >
                                                        <span className="material-symbols-outlined text-[20px]">history</span>
                                                        <span>RESET ORIGINAL</span>
                                                    </button>
                                                </div>

                                                {isTransforming && (
                                                    <div className="absolute inset-0 bg-[#13200f]/95 backdrop-blur-md z-20 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
                                                        <div className="size-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin mb-6"></div>
                                                        <h4 className="text-primary font-black uppercase tracking-[0.3em] text-[13px]">Deep Neural Passthrough</h4>
                                                        <p className="text-white/40 text-[9px] mt-2 font-bold uppercase">Synthesizing new perspective...</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Visual MindMap Modal */}
                {showMindMap && (
                    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-2 md:p-4 transition-all animate-in fade-in duration-300">
                        <div className="bg-[#0f1a0b] w-full max-w-7xl h-full rounded-[3rem] border border-white/10 flex flex-col overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300 relative">

                            {/* Modal Header */}
                            <div className="px-10 py-8 border-b border-white/10 flex items-center justify-between bg-[#13200f] relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center justify-center size-12 rounded-2xl bg-primary/20 text-primary shadow-lg shadow-primary/10">
                                        <span className="material-symbols-outlined text-[28px] fill-1">account_tree</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <h2 className="text-white text-2xl font-black uppercase tracking-[0.2em]">Visual Mind Map</h2>
                                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-0.5">Interactive Knowledge Graph</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowMindMap(false)}
                                    className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white size-12 rounded-2xl transition-all flex items-center justify-center border border-red-500/20 active:scale-90"
                                >
                                    <span className="material-symbols-outlined text-[24px]">close</span>
                                </button>
                            </div>

                            {/* MindMap Content */}
                            <div className="flex-1 overflow-hidden relative">
                                <MindMap content={summary} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Game Selector */}
                {showGames && (
                    <GameSelector
                        transcript={sessionData.transcript}
                        summary={summary}
                        onClose={() => setShowGames(false)}
                    />
                )}
            </main>
        </div>
    );
}
