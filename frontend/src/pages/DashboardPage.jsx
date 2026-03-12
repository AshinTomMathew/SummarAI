import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Logo from '../components/Logo';
import ConfirmModal from '../components/ConfirmModal';
import BackButton from '../components/BackButton';

export default function DashboardPage() {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState('Guest');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState(null);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    const getInitials = (name) => {
        if (!name || name === 'Guest') return 'G';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    const [dbOnline, setDbOnline] = useState(true);

    useEffect(() => {
        const fetchSessionsAndUser = async () => {
            if (window.electronAPI) {
                const userId = await window.electronAPI.getActiveId();

                if (userId) {
                    // Logged in User Flow
                    const result = await window.electronAPI.getSessions(userId);
                    let dbSessions = [];
                    if (result.success) {
                        dbSessions = result.sessions;
                        setDbOnline(true);
                    } else {
                        setDbOnline(false);
                    }

                    // Add offline fallback sessions
                    const fallbackKey = `fallbackSessions_${userId}`;
                    const fallback = JSON.parse(localStorage.getItem(fallbackKey) || '[]');
                    const merged = [...dbSessions];
                    for (const fs of fallback) {
                        if (!merged.find(s => s.id === fs.id)) merged.push(fs);
                    }
                    setSessions(merged);

                    const userResult = await window.electronAPI.getUser(userId);
                    if (userResult.success) {
                        setUserName(userResult.user.name);
                    }
                } else {
                    // Guest Flow
                    setUserName('Guest');
                    const guestSessions = JSON.parse(localStorage.getItem('guestSessions') || '[]');
                    setSessions(guestSessions);
                }
                setLoading(false);
            } else {
                setLoading(false);
            }
        };
        fetchSessionsAndUser();
    }, []);

    // Filter and Sort Logic
    const filteredSessions = sessions
        .filter(s =>
            s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.classification && s.classification.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.date) - new Date(a.date);
            if (sortBy === 'oldest') return new Date(a.date) - new Date(b.date);
            if (sortBy === 'az') return a.title.localeCompare(b.title);
            return 0;
        });

    const confirmDelete = async () => {
        if (!sessionToDelete) return;

        try {
            // Assume it works optimistically
            setSessions(prev => prev.filter(s => s.id !== sessionToDelete.id));

            // Remote DB delete
            if (window.electronAPI && !sessionToDelete.id.toString().startsWith('fallback_') && !sessionToDelete.id.toString().startsWith('guest_')) {
                await window.electronAPI.deleteSession(sessionToDelete.id);
            }

            // Local fallback delete
            if (sessionToDelete.id.toString().startsWith('fallback_')) {
                const userId = await window.electronAPI.getActiveId();
                const fallbackKey = `fallbackSessions_${userId}`;
                let fallback = JSON.parse(localStorage.getItem(fallbackKey) || '[]');
                fallback = fallback.filter(s => s.id !== sessionToDelete.id);
                localStorage.setItem(fallbackKey, JSON.stringify(fallback));
            } else if (sessionToDelete.id.toString().startsWith('guest_')) {
                let guestSessions = JSON.parse(localStorage.getItem('guestSessions') || '[]');
                guestSessions = guestSessions.filter(s => s.id !== sessionToDelete.id);
                localStorage.setItem('guestSessions', JSON.stringify(guestSessions));
            }
        } catch (e) {
            console.error("Delete error", e);
        }
        
        setSessionToDelete(null);
    };

    const handleClearAll = () => {
        localStorage.removeItem('guestSessions');
        setSessions([]);
        setShowClearConfirm(false);
    };

    return (
        <div className="flex h-screen w-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display overflow-hidden">
            <Sidebar active="/dashboard" />
            <main className="flex-1 flex flex-col h-full overflow-y-auto relative scroll-smooth">
                <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-background-dark sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <BackButton />
                        <Logo />
                    </div>
                    <button className="text-white p-2">
                        <span className="material-symbols-outlined">menu</span>
                    </button>
                </div>
                <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 flex flex-col gap-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex flex-col gap-2">
                            <h2 className="text-white text-3xl md:text-4xl font-black leading-tight tracking-tight">
                                {(() => {
                                    const hour = new Date().getHours();
                                    if (hour < 12) return 'Good Morning, ';
                                    if (hour < 17) return 'Good Afternoon, ';
                                    return 'Good Evening, ';
                                })()}
                                {userName}
                            </h2>
                            <p className="text-white/60 text-base font-normal">
                                {userName === 'Guest' && (
                                    <span className="bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded-full text-xs font-bold uppercase mr-2 tracking-wider">Guest Mode</span>
                                )}
                                You have analyzed <span className="text-primary font-bold">{sessions.length} meetings</span> so far.
                            </p>
                        </div>

                        <div className="flex items-center gap-4">
                            <Link to="/new-session" className="group flex items-center gap-2 bg-primary hover:bg-[#3bdb0f] active:scale-95 transition-all cursor-pointer rounded-full h-11 px-6 text-background-dark text-sm font-bold shadow-[0_0_20px_rgba(70,236,19,0.3)] hover:shadow-[0_0_30px_rgba(70,236,19,0.5)]">
                                <span className="material-symbols-outlined text-[20px]">add_circle</span>
                                <span>Start New Session</span>
                            </Link>

                            <div className="flex items-center gap-3 bg-surface-dark border border-white/5 rounded-full pl-2 pr-4 py-1.5 shadow-sm">
                                <div className="bg-primary/20 flex items-center justify-center rounded-full size-8 text-primary font-bold text-xs border border-primary/30">
                                    {getInitials(userName)}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-white text-xs font-bold leading-none">{userName}</span>
                                    <span className="text-white/40 text-[9px] uppercase tracking-tighter">{userName === 'Guest' ? 'Guest' : 'Pro'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {!dbOnline && userName !== 'Guest' && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 p-4 rounded-xl flex items-start md:items-center gap-3">
                            <span className="material-symbols-outlined shrink-0 mt-0.5 md:mt-0">cloud_off</span>
                            <div className="flex-1 text-sm">
                                <strong className="font-bold">Database Unreachable:</strong> We couldn't connect to the cloud database. Your recent sessions are temporarily saved locally and will remain here until the connection is restored.
                            </div>
                        </div>
                    )}

                    {userName === 'Guest' && (
                        <div className="rounded-xl border border-orange-500/30 bg-gradient-to-r from-orange-900/20 to-background-dark p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex gap-4">
                                <div className="hidden sm:flex size-10 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-orange-500">
                                    <span className="material-symbols-outlined">warning</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <p className="text-white text-base font-bold leading-tight">Temporary Guest Session Active</p>
                                    <p className="text-white/70 text-sm font-normal leading-normal max-w-xl">
                                        You are limited to 5 recent sessions. All data will be deleted when you clear your browser cache.
                                    </p>
                                </div>
                            </div>
                            <Link to="/register" className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-full text-sm font-bold transition-all shadow-lg shadow-orange-500/20 shrink-0">
                                Create Account to Save
                            </Link>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex flex-col gap-2 rounded-2xl p-6 bg-surface-dark border border-white/5 hover:border-primary/30 transition-colors group">
                            <div className="flex items-center justify-between">
                                <p className="text-white/70 text-sm font-medium">Total Sessions</p>
                                <div className="bg-white/5 p-2 rounded-full group-hover:bg-primary/20 transition-colors">
                                    <span className="material-symbols-outlined text-primary text-[20px]">groups</span>
                                </div>
                            </div>
                            <div className="flex items-end gap-3 mt-2">
                                <p className="text-white text-4xl font-bold tracking-tight">{sessions.length}</p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 rounded-2xl p-6 bg-surface-dark border border-white/5 hover:border-primary/30 transition-colors group">
                            <div className="flex items-center justify-between">
                                <p className="text-white/70 text-sm font-medium">Processing Time</p>
                                <div className="bg-white/5 p-2 rounded-full group-hover:bg-primary/20 transition-colors">
                                    <span className="material-symbols-outlined text-primary text-[20px]">schedule</span>
                                </div>
                            </div>
                            <div className="flex items-end gap-3 mt-2">
                                <p className="text-white text-4xl font-bold tracking-tight">Fast</p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 rounded-2xl p-6 bg-surface-dark border border-white/5 hover:border-primary/30 transition-colors group">
                            <div className="flex items-center justify-between">
                                <p className="text-white/70 text-sm font-medium">Insights Generated</p>
                                <div className="bg-white/5 p-2 rounded-full group-hover:bg-primary/20 transition-colors">
                                    <span className="material-symbols-outlined text-primary text-[20px]">auto_awesome</span>
                                </div>
                            </div>
                            <div className="flex items-end gap-3 mt-2">
                                <p className="text-white text-4xl font-bold tracking-tight">{sessions.length * 5}+</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <h3 className="text-white text-xl font-bold">Recent Sessions</h3>
                                {userName === 'Guest' && sessions.length > 0 && (
                                    <button onClick={() => setShowClearConfirm(true)} className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 border border-red-400/20 px-3 py-1 rounded-full bg-red-400/5">
                                        <span className="material-symbols-outlined text-[14px]">delete_sweep</span> Clear All
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                {/* Search Bar (Liquid Glass Style) */}
                                <div className="relative flex-1 min-w-[240px] group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <div className="relative flex items-center bg-white/5 backdrop-blur-md border border-white/10 rounded-full h-10 transition-all focus-within:bg-white/10 focus-within:border-primary/30 focus-within:shadow-[0_0_15px_rgba(70,236,19,0.2)]">
                                        <span className="material-symbols-outlined absolute left-3 text-white/40 text-[20px]">search</span>
                                        <input
                                            type="text"
                                            placeholder="Search by title or category..."
                                            className="w-full bg-transparent border-none outline-none pl-10 pr-4 text-white text-sm placeholder-white/30"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Sort Options (Custom Liquid Glass Dropdown) */}
                                <div className="relative z-50">
                                    <button
                                        onClick={() => setIsSortOpen(!isSortOpen)}
                                        onBlur={() => setTimeout(() => setIsSortOpen(false), 200)}
                                        className="relative group flex items-center justify-between gap-3 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-5 py-2 transition-all hover:border-primary/30 hover:shadow-[0_0_15px_rgba(70,236,19,0.1)] min-w-[160px]"
                                    >
                                        <div className="flex items-center gap-2 text-white/80 group-hover:text-white transition-colors">
                                            <span className="material-symbols-outlined text-[18px]">sort</span>
                                            <span className="text-sm font-medium">
                                                {sortBy === 'newest' && 'Newest First'}
                                                {sortBy === 'oldest' && 'Oldest First'}
                                                {sortBy === 'az' && 'Title A-Z'}
                                            </span>
                                        </div>
                                        <span className={`material-symbols-outlined text-[16px] text-white/50 transition-transform duration-300 ${isSortOpen ? 'rotate-180' : ''}`}>expand_more</span>
                                    </button>

                                    {/* Dropdown Menu */}
                                    <div className={`absolute top-full right-0 mt-2 w-full min-w-[180px] bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-1 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] flex flex-col gap-1 transition-all duration-200 origin-top-right ${isSortOpen ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
                                        {[
                                            { label: 'Newest First', value: 'newest', icon: 'history' },
                                            { label: 'Oldest First', value: 'oldest', icon: 'update' },
                                            { label: 'Title A-Z', value: 'az', icon: 'abc' }
                                        ].map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => {
                                                    setSortBy(option.value);
                                                    setIsSortOpen(false);
                                                }}
                                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${sortBy === option.value ? 'bg-primary/20 text-primary' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                                            >
                                                <span className="material-symbols-outlined text-[18px]">{option.icon}</span>
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <p className="text-white/50">Loading sessions...</p>
                    ) : filteredSessions.length === 0 ? (
                        <div className="bg-surface-dark rounded-xl p-8 text-center border border-white/5">
                            <p className="text-white/50 mb-4">
                                {searchQuery ? 'No meetings match your search query.' : 'No sessions found. Start a new analysis to see results here!'}
                            </p>
                            {!searchQuery && (
                                <Link to="/new-session" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 px-6 py-2 rounded-full text-white font-medium transition-colors">
                                    Start Analysis
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {filteredSessions.map(session => {
                                // Sanitize title for display
                                const displayTitle = session.title ? session.title.replace(/^(compressed_|vid_\d+_)+/g, '') : 'Untitled Meeting';

                                const handleDelete = (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSessionToDelete({ id: session.id, title: displayTitle });
                                };

                                return (
                                    <div key={session.id} className="relative group">
                                        <Link to="/transcript" state={session} className="flex flex-col sm:flex-row gap-4 rounded-2xl bg-surface-dark p-4 border border-white/5 hover:border-primary/20 transition-all shadow-sm">
                                            <div className="w-full sm:w-32 aspect-video sm:aspect-square rounded-xl bg-cover bg-center shrink-0 relative overflow-hidden bg-white/5 flex items-center justify-center">
                                                {session.visuals && session.visuals.length > 0 ? (
                                                    <img
                                                        src={
                                                            // Cloudinary URL (starts with https) → use directly
                                                            // Local path → use media:// protocol
                                                            (session.visuals[0].url || session.visuals[0].path || '').startsWith('https')
                                                                ? (session.visuals[0].url || session.visuals[0].path)
                                                                : `media://local?path=${encodeURIComponent(session.visuals[0].path || session.visuals[0].url || '')}`
                                                        }
                                                        className="w-full h-full object-cover"
                                                        alt="Meeting Preview"
                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                    />
                                                ) : null}
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                                    <span className="material-symbols-outlined text-white/50 text-[32px]">
                                                        {session.source_type === 'link' ? 'link' : (session.source_type === 'recording' ? 'mic' : 'upload_file')}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col justify-between flex-1 min-w-0 py-0.5">
                                                <div className="min-w-0">
                                                    <div className="flex justify-between items-start mb-1 gap-2 min-w-0">
                                                        <h4 className="text-white text-[15px] sm:text-base font-bold leading-tight truncate flex-1 min-w-0 group-hover:text-primary transition-colors" title={displayTitle}>{displayTitle}</h4>
                                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                                            <div className="bg-primary/10 text-primary text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border border-primary/20">{session.classification || 'General'}</div>
                                                            <button
                                                                onClick={handleDelete}
                                                                className="size-5 rounded-md bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white border border-red-500/20 transition-all active:scale-95 shadow-md"
                                                                title="Delete Session"
                                                            >
                                                                <span className="material-symbols-outlined text-[12px]">delete</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-white/40 text-xs mb-3">{new Date(session.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 rounded-full h-8 flex items-center justify-center bg-white/5 group-hover:bg-primary group-hover:text-background-dark text-white text-xs font-bold transition-all border border-white/5">
                                                        View Analysis Details
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <ConfirmModal
                    isOpen={!!sessionToDelete}
                    title="Delete Meeting"
                    message={sessionToDelete ? `Are you sure you want to delete "${sessionToDelete.title}"? This cannot be undone.` : ''}
                    onConfirm={confirmDelete}
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
