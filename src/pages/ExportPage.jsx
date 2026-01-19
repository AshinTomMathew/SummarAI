import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from '../components/Logo';
import BackButton from '../components/BackButton';

export default function ExportPage() {
    const location = useLocation();
    const sessionData = location.state || {
        title: "No Session Data",
        date: new Date(),
        duration: 0,
        summary: "No summary available."
    };

    const [userName, setUserName] = useState('Guest');

    useEffect(() => {
        const fetchUser = async () => {
            if (window.electronAPI) {
                const result = await window.electronAPI.getSessionUser();
                if (result.success) setUserName(result.user.name);
            }
        };
        fetchUser();
    }, []);

    const formatDuration = (seconds) => {
        if (!seconds) return '0s';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    };

    const getInitials = (name) => {
        if (!name || name === 'Guest') return 'G';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    const handleExport = async (format) => {
        if (window.electronAPI) {
            const result = await window.electronAPI.exportReport({
                sessionData: sessionData,
                format: format
            });
            if (result.success) {
                alert(`Exported ${format.toUpperCase()} to: ${result.path}`);
            } else {
                alert(`Export failed: ${result.error}`);
            }
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-white min-h-screen flex flex-col overflow-x-hidden">
            <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-surface-border px-6 lg:px-10 py-4 bg-background-dark">
                <div className="flex items-center gap-4">
                    <BackButton />
                    <Logo />
                </div>
                <div className="flex items-center gap-4 lg:gap-8">
                    <div className="hidden md:flex items-center gap-9">
                        <Link to="/dashboard" className="text-text-muted hover:text-white text-sm font-medium leading-normal transition-colors">Dashboard</Link>
                        <Link to="/transcript" state={sessionData} className="text-text-muted hover:text-white text-sm font-medium leading-normal transition-colors">Back to Transcript</Link>
                    </div>
                    <div className="bg-primary/20 flex items-center justify-center rounded-full size-10 text-primary font-bold border border-primary/20">
                        {getInitials(userName)}
                    </div>
                </div>
            </header>
            <div className="layout-container flex flex-col items-center flex-1 w-full px-4 md:px-10 lg:px-20 py-8">
                <div className="max-w-[1200px] w-full flex flex-col gap-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <main className="lg:col-span-8 flex flex-col gap-6">
                            <div className="flex flex-wrap justify-between items-end gap-4">
                                <div className="flex flex-col gap-2">
                                    <h1 className="text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">Export Report</h1>
                                    <p className="text-text-muted text-base font-normal">Review the generated summary before exporting.</p>
                                </div>
                                <div className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full bg-surface-dark border border-surface-border bg-opacity-50 pl-4 pr-4">
                                    <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                                    <p className="text-white text-sm font-medium leading-normal">AI Processing Complete</p>
                                </div>
                            </div>
                            <div className="bg-surface-dark rounded-xl border border-surface-border overflow-hidden flex flex-col shadow-2xl shadow-black/40">
                                <div className="p-8 border-b border-surface-border bg-[#1a2c15]">
                                    <h2 className="text-2xl font-bold text-white mb-2">{sessionData.title}</h2>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                                        <div className="flex flex-col"><span className="text-xs text-text-muted mb-1">Date</span><span className="text-sm font-medium text-white">{new Date(sessionData.date).toLocaleDateString()}</span></div>
                                        <div className="flex flex-col"><span className="text-xs text-text-muted mb-1">Duration</span><span className="text-sm font-medium text-white">{formatDuration(sessionData.duration)}</span></div>
                                    </div>
                                </div>
                                <div className="p-8 space-y-8 bg-[#162512]">
                                    <section>
                                        <h3 className="text-primary text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-lg">summarize</span> Executive Summary
                                        </h3>
                                        <div className="text-gray-300 text-sm leading-relaxed space-y-3 whitespace-pre-wrap">
                                            {sessionData.summary}
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </main>
                        <aside className="lg:col-span-4 flex flex-col gap-6">
                            <div className="bg-surface-dark p-6 rounded-xl border border-surface-border sticky top-6 shadow-xl shadow-black/20">
                                <h3 className="text-white text-lg font-bold mb-4">Export Options</h3>
                                <div className="flex flex-col gap-3">
                                    <button onClick={() => handleExport('pdf')} className="flex items-center justify-center gap-3 w-full bg-primary hover:bg-[#3bd60f] text-background-dark font-bold py-3 px-6 rounded-full transition-all shadow-[0_0_15px_rgba(70,236,19,0.2)]">
                                        <span className="material-symbols-outlined text-xl">picture_as_pdf</span>Download PDF
                                    </button>
                                    <button onClick={() => handleExport('docx')} className="flex items-center justify-center gap-3 w-full border-2 border-primary text-primary hover:bg-primary hover:text-background-dark font-bold py-3 px-6 rounded-full transition-all">
                                        <span className="material-symbols-outlined text-xl">description</span>Download DOCX
                                    </button>
                                    <button onClick={() => handleExport('txt')} className="flex items-center justify-center gap-3 w-full text-text-muted hover:text-white font-bold py-3 px-6 rounded-full transition-all">
                                        <span className="material-symbols-outlined text-xl">text_fields</span>Download TXT
                                    </button>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </div>
        </div>
    );
}
