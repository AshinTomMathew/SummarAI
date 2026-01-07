import { Link, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import BackButton from '../components/BackButton';

export default function TranscriptPage() {
    // ... existing state/logic ...
    const location = useLocation();
    const sessionData = location.state || {
        title: "No Session Selected",
        transcript: "No transcript available.",
        summary: "No summary available.",
        classification: "N/A",
        date: new Date()
    };

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display overflow-hidden h-screen flex">
            <Sidebar active="/transcript" />
            <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
                <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-[#2c4823] px-6 py-4 bg-background-light dark:bg-[#152211] shrink-0 z-20">
                    <div className="flex items-center gap-4 text-slate-900 dark:text-white min-w-0">
                        <BackButton />
                        <div className="size-8 text-primary flex items-center justify-center bg-primary/10 rounded-full">
                            <span className="material-symbols-outlined text-xl">graphic_eq</span>
                        </div>
                        <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] truncate">Analysis Result</h2>
                    </div>
                    <div className="flex items-center gap-4 pl-4">
                        <div className="hidden sm:flex gap-2">
                            {/* Use sessionData for export context potentially */}
                            <Link to="/export" state={sessionData} className="flex cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-6 bg-primary text-[#152211] hover:bg-[#3cd610] transition-colors text-sm font-bold leading-normal tracking-[0.015em] shadow-[0_0_15px_rgba(70,236,19,0.3)]">
                                <span className="truncate">Share / Export</span>
                            </Link>
                            <Link to="/chat" className="flex cursor-pointer items-center justify-center overflow-hidden rounded-full size-10 bg-slate-200 dark:bg-[#2c4823] text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-[#3a5e2e] transition-colors">
                                <span className="material-symbols-outlined text-[20px]">chat</span>
                            </Link>
                        </div>
                    </div>
                </header>
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 py-6 shrink-0">
                        <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-4">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider border border-primary/20">
                                        <span className="size-1.5 rounded-full bg-primary animate-pulse"></span>{sessionData.classification}
                                    </span>
                                    <span className="text-slate-500 dark:text-text-muted text-sm font-medium">{new Date(sessionData.date).toLocaleDateString()}</span>
                                </div>
                                <h1 className="text-slate-900 dark:text-white tracking-tight text-3xl md:text-4xl font-bold leading-tight">{sessionData.title}</h1>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden px-6 pb-24">
                        <div className="flex flex-col lg:flex-row h-full gap-6">
                            <div className="w-full lg:w-3/5 h-full flex flex-col bg-white dark:bg-[#1c2e17] rounded-xl border border-slate-200 dark:border-[#2c4823] overflow-hidden shadow-xl">
                                <div className="px-4 py-3 border-b border-slate-200 dark:border-[#2c4823] flex items-center justify-between bg-slate-50 dark:bg-[#152211]">
                                    <h3 className="text-slate-900 dark:text-white font-bold flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">description</span>Transcript
                                    </h3>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                    <p className="text-slate-700 dark:text-gray-300 text-base leading-relaxed whitespace-pre-wrap">
                                        {sessionData.transcript}
                                    </p>
                                </div>
                            </div>
                            <div className="w-full lg:w-2/5 h-full flex flex-col gap-4 overflow-y-auto pr-1">
                                <div className="bg-white dark:bg-[#1c2e17] rounded-xl border border-slate-200 dark:border-[#2c4823] p-5 shadow-lg relative overflow-hidden">
                                    <h3 className="text-slate-900 dark:text-white font-bold flex items-center gap-2 mb-4">
                                        <span className="material-symbols-outlined text-primary fill-1">auto_awesome</span>AI Summary
                                    </h3>
                                    <p className="text-slate-700 dark:text-gray-300 text-sm leading-relaxed mb-4 whitespace-pre-wrap">
                                        {sessionData.summary}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
