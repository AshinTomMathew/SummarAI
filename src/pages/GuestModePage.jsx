import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Logo from '../components/Logo';
import ConfirmModal from '../components/ConfirmModal';
import BackButton from '../components/BackButton';

export default function GuestModePage() {
    const [sessions, setSessions] = useState([]);
    const [sessionToDelete, setSessionToDelete] = useState(null);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    useEffect(() => {
        try {
            const guestSessions = JSON.parse(localStorage.getItem('guestSessions') || '[]');
            setSessions(guestSessions);
        } catch (e) {
            setSessions([]);
        }
    }, []);

    const handleDelete = () => {
        if (!sessionToDelete) return;
        const updated = sessions.filter(s => s.id !== sessionToDelete.id);
        localStorage.setItem('guestSessions', JSON.stringify(updated));
        setSessions(updated);
        setSessionToDelete(null);
    };

    const handleClearAll = () => {
        localStorage.removeItem('guestSessions');
        setSessions([]);
        setShowClearConfirm(false);
    };

    return (
        <div className="flex h-screen w-full bg-background-light dark:bg-background-dark text-[#152211] dark:text-white font-display overflow-hidden">
            <Sidebar active="/guest" />
            <main className="flex-1 flex flex-col h-full overflow-y-auto bg-background-light dark:bg-background-dark relative">
                <header className="flex items-center justify-between p-4 border-b border-white/10 bg-background-dark sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <BackButton />
                        <Logo />
                    </div>
                </header>
                <div className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8 flex flex-col gap-8">
                    <div className="@container">
                        <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-orange-500/30 bg-gradient-to-r from-orange-900/20 to-background-dark p-5 @[600px]:flex-row @[600px]:items-center">
                            <div className="flex gap-4">
                                <div className="hidden sm:flex size-10 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-orange-500">
                                    <span className="material-symbols-outlined">warning</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <p className="text-white text-base font-bold leading-tight">Temporary Guest Session Active</p>
                                    <p className="text-text-secondary text-sm font-normal leading-normal max-w-xl text-white/70">
                                        You are limited to 5 recent sessions. All data will be deleted when you clear your browser cache.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <h1 className="text-white text-3xl md:text-4xl font-black tracking-tight">Start a new analysis</h1>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Link to="/new-session" className="group relative flex flex-col items-start gap-4 p-6 rounded-[2rem] bg-surface-dark border border-white/10 hover:border-primary transition-all text-left">
                            <div className="size-14 rounded-full bg-primary flex items-center justify-center text-background-dark group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-3xl">mic</span>
                            </div>
                            <div>
                                <h3 className="text-white text-xl font-bold mb-1">Record Meeting</h3>
                                <p className="text-white/60 text-sm">Start a live recording and get real-time transcription.</p>
                            </div>
                        </Link>
                        <Link to="/new-session" className="group relative flex flex-col items-start gap-4 p-6 rounded-[2rem] bg-surface-dark border border-white/10 hover:border-white/50 transition-all text-left">
                            <div className="size-14 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-white group-hover:text-background-dark transition-colors">
                                <span className="material-symbols-outlined text-3xl">upload_file</span>
                            </div>
                            <div>
                                <h3 className="text-white text-xl font-bold mb-1">Upload Audio</h3>
                                <p className="text-white/60 text-sm">Import MP3, WAV or M4A files.</p>
                            </div>
                        </Link>
                    </div>

                    <div className="mt-8 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-white text-2xl font-bold">Recent Guest Analyses</h2>
                            {sessions.length > 0 && (
                                <button onClick={() => setShowClearConfirm(true)} className="text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[16px]">delete_sweep</span> Clear All
                                </button>
                            )}
                        </div>

                        {sessions.length === 0 ? (
                            <div className="bg-surface-dark border border-white/5 p-8 rounded-2xl text-center">
                                <p className="text-white/50">No guest sessions yet. Start an analysis above!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {sessions.map(session => (
                                    <div key={session.id} className="relative group">
                                        <Link to="/transcript" state={session} className="flex flex-col sm:flex-row gap-4 rounded-2xl bg-surface-dark p-4 border border-white/5 hover:border-primary/30 transition-all shadow-sm">
                                            <div className="flex flex-col justify-between flex-1 py-1 min-w-0">
                                                <div className="min-w-0">
                                                    <div className="flex justify-between items-start mb-2 gap-2 min-w-0">
                                                        <h4 className="text-white text-base sm:text-lg font-bold leading-tight truncate flex-1 min-w-0 group-hover:text-primary transition-colors" title={session.title}>{session.title || 'Untitled Session'}</h4>
                                                        <button
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSessionToDelete({ id: session.id, title: session.title }); }}
                                                            className="size-6 rounded-md bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-95 shrink-0"
                                                            title="Delete Session"
                                                        >
                                                            <span className="material-symbols-outlined text-[14px]">delete</span>
                                                        </button>
                                                    </div>
                                                    <p className="text-white/40 text-xs mb-3">{new Date(session.date).toLocaleString()}</p>
                                                    <div className="bg-primary/10 text-primary w-fit text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-primary/20">
                                                        {session.classification || 'General'}
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <ConfirmModal
                    isOpen={!!sessionToDelete}
                    title="Delete Guest Session"
                    message={sessionToDelete ? `Are you sure you want to delete "${sessionToDelete.title || 'Untitled Session'}"? This action cannot be undone.` : ''}
                    onConfirm={handleDelete}
                    onCancel={() => setSessionToDelete(null)}
                />

                <ConfirmModal
                    isOpen={showClearConfirm}
                    title="Clear All Sessions"
                    message="Are you sure you want to completely clear your temporary guest history? You will lose access to all these analyses."
                    onConfirm={handleClearAll}
                    onCancel={() => setShowClearConfirm(false)}
                />
            </main>
        </div>
    );
}
