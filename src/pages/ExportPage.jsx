import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from '../components/Logo';
import BackButton from '../components/BackButton';
import LiquidGlassPopup from '../components/LiquidGlassPopup';

export default function ExportPage() {
    const location = useLocation();
    const [selectedSession, setSelectedSession] = useState(location.state);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(!location.state);
    const [userName, setUserName] = useState('Guest');
    const [popup, setPopup] = useState({ isOpen: false, message: '', type: 'success' });

    useEffect(() => {
        const fetchData = async () => {
            if (window.electronAPI) {
                const userId = await window.electronAPI.getActiveId();

                // Fetch User
                if (userId) {
                    const userResult = await window.electronAPI.getUser(userId);
                    if (userResult.success) setUserName(userResult.user.name);
                }

                // If no session selected, fetch all sessions
                if (!selectedSession) {
                    if (userId) {
                        const result = await window.electronAPI.getSessions(userId);
                        if (result.success) setSessions(result.sessions);
                    } else {
                        // Guest sessions
                        const localSessions = JSON.parse(localStorage.getItem('guestSessions') || '[]');
                        setSessions(localSessions);
                    }
                }
            }
            setLoading(false);
        };
        fetchData();
    }, [selectedSession]);

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

    const handleExport = async (session, format) => {
        if (window.electronAPI) {
            setPopup({ isOpen: true, message: `Exporting ${format.toUpperCase()}...`, type: 'info' });
            const result = await window.electronAPI.exportReport({
                sessionData: session,
                format: format
            });
            if (result.success) {
                setPopup({ 
                    isOpen: true, 
                    message: `Successfully exported ${format.toUpperCase()}!\nFile saved to: ${result.path}`, 
                    type: 'success' 
                });
            } else {
                setPopup({ 
                    isOpen: true, 
                    message: `Export failed: ${result.error}`, 
                    type: 'error' 
                });
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
                        {selectedSession && (
                            <button onClick={() => setSelectedSession(null)} className="text-text-muted hover:text-white text-sm font-medium leading-normal transition-colors">Change Session</button>
                        )}
                    </div>
                    <div className="bg-primary/20 flex items-center justify-center rounded-full size-10 text-primary font-bold border border-primary/20">
                        {getInitials(userName)}
                    </div>
                </div>
            </header>

            <div className="layout-container flex flex-col items-center flex-1 w-full px-4 md:px-10 lg:px-20 py-8">
                <div className="max-w-[1200px] w-full flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">Export Reports</h1>
                        <p className="text-text-muted text-base font-normal">
                            {selectedSession ? "Review the generated summary before exporting." : "Select a meeting analysis to export as a professional report."}
                        </p>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                            <p className="text-text-muted">Loading your meetings...</p>
                        </div>
                    ) : selectedSession ? (
                        // SINGLE SESSION PREVIEW
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            <main className="lg:col-span-8 flex flex-col gap-6">
                                <div className="bg-surface-dark rounded-xl border border-surface-border overflow-hidden flex flex-col shadow-2xl shadow-black/40">
                                    <div className="p-8 border-b border-surface-border bg-[#1a2c15]">
                                        <h2 className="text-2xl font-bold text-white mb-2">{selectedSession.title}</h2>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-text-muted mb-1">Date</span>
                                                <span className="text-sm font-medium text-white">{new Date(selectedSession.date).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs text-text-muted mb-1">Duration</span>
                                                <span className="text-sm font-medium text-white">{formatDuration(selectedSession.duration)}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs text-text-muted mb-1">Category</span>
                                                <span className="text-sm font-medium text-primary">{selectedSession.classification || 'General'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-8 space-y-8 bg-[#162512]">
                                        <section>
                                            <h3 className="text-primary text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-lg">summarize</span> Executive Summary
                                            </h3>
                                            <div className="text-gray-300 text-sm leading-relaxed space-y-3 whitespace-pre-wrap">
                                                {selectedSession.summary}
                                            </div>
                                        </section>
                                    </div>
                                </div>
                            </main>
                            <aside className="lg:col-span-4 flex flex-col gap-6">
                                <div className="bg-surface-dark p-6 rounded-xl border border-surface-border sticky top-6 shadow-xl shadow-black/20">
                                    <h3 className="text-white text-lg font-bold mb-4">Export Options</h3>
                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={() => handleExport(selectedSession, 'pdf')}
                                            className="flex items-center justify-center gap-3 w-full bg-primary hover:bg-[#3bd60f] text-background-dark font-bold py-3 px-6 rounded-full transition-all shadow-[0_0_15px_rgba(70,236,19,0.2)]"
                                        >
                                            <span className="material-symbols-outlined text-xl">picture_as_pdf</span>Download PDF
                                        </button>
                                        <button
                                            onClick={() => handleExport(selectedSession, 'docx')}
                                            className="flex items-center justify-center gap-3 w-full border-2 border-primary text-primary hover:bg-primary hover:text-background-dark font-bold py-3 px-6 rounded-full transition-all"
                                        >
                                            <span className="material-symbols-outlined text-xl">description</span>Download DOCX
                                        </button>
                                        <button
                                            onClick={() => handleExport(selectedSession, 'txt')}
                                            className="flex items-center justify-center gap-3 w-full text-text-muted hover:text-white font-bold py-3 px-6 rounded-full transition-all"
                                        >
                                            <span className="material-symbols-outlined text-xl">text_fields</span>Download TXT
                                        </button>
                                        <div className="h-px bg-white/5 my-2"></div>
                                        <button
                                            onClick={() => setSelectedSession(null)}
                                            className="flex items-center justify-center gap-3 w-full text-white/40 hover:text-white text-sm font-medium py-2 transition-all"
                                        >
                                            Choose a different session
                                        </button>
                                    </div>
                                </div>
                            </aside>
                        </div>
                    ) : (
                        // SESSION LIST
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {sessions.length === 0 ? (
                                <div className="col-span-full bg-surface-dark rounded-2xl p-20 text-center border border-white/5 border-dashed">
                                    <div className="bg-white/5 size-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <span className="material-symbols-outlined text-4xl text-white/20">folder_open</span>
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">No Meetings Found</h3>
                                    <p className="text-text-muted mb-8">You haven't analyzed any meetings yet. Analyze a meeting first to export it.</p>
                                    <Link to="/new-session" className="bg-primary text-background-dark px-8 py-3 rounded-full font-bold">Start Analysis</Link>
                                </div>
                            ) : (
                                sessions.map(session => (
                                    <div key={session.id} className="bg-surface-dark rounded-2xl border border-white/5 overflow-hidden hover:border-primary/30 transition-all group flex flex-col">
                                        <div className="p-6 flex-1 flex flex-col gap-4">
                                            <div className="flex justify-between items-start">
                                                <div className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider border border-primary/20">
                                                    {session.classification || 'General'}
                                                </div>
                                                <span className="text-white/40 text-xs">{new Date(session.date).toLocaleDateString()}</span>
                                            </div>
                                            <h3 className="text-white font-bold text-lg line-clamp-2 leading-tight group-hover:text-primary transition-colors">{session.title}</h3>
                                            <p className="text-text-muted text-sm line-clamp-3 flex-1">{session.summary}</p>
                                        </div>
                                        <div className="p-4 bg-black/20 flex gap-2 border-t border-white/5">
                                            <button
                                                onClick={() => setSelectedSession(session)}
                                                className="flex-1 bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-2 rounded-lg transition-colors border border-white/10"
                                            >
                                                Preview
                                            </button>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => handleExport(session, 'pdf')}
                                                    className="p-2 bg-primary/10 hover:bg-primary text-primary hover:text-black rounded-lg transition-all"
                                                    title="Quick Export PDF"
                                                >
                                                    <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
                                                </button>
                                                <button
                                                    onClick={() => handleExport(session, 'docx')}
                                                    className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all border border-white/10"
                                                    title="Quick Export DOCX"
                                                >
                                                    <span className="material-symbols-outlined text-xl">description</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Liquid Glass Popup */}
            <LiquidGlassPopup
                isOpen={popup.isOpen}
                onClose={() => setPopup({ ...popup, isOpen: false })}
                message={popup.message}
                type={popup.type}
            />
        </div>
    );
}
