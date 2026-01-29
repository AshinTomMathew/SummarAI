import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Sidebar({ active }) {
    const location = useLocation();
    const [userName, setUserName] = useState('Guest');

    useEffect(() => {
        const fetchUser = async () => {
            if (window.electronAPI) {
                const result = await window.electronAPI.getSessionUser();
                if (result.success) {
                    setUserName(result.user.name);
                } else {
                    setUserName('Guest');
                }
            }
        };
        fetchUser();
        // Set up an interval to refresh slightly or rely on mount
        const interval = setInterval(fetchUser, 5000);
        return () => clearInterval(interval);
    }, []);

    const isActive = (path) => location.pathname === path;
    const getLinkClass = (path) => `flex items-center gap-3 px-4 py-3 rounded-full transition-colors group ${isActive(path) ? 'bg-primary/20 text-primary' : 'text-white/70 hover:bg-white/5 hover:text-white'}`;
    const getIconClass = (path) => `material-symbols-outlined ${isActive(path) ? 'filled' : ''} group-hover:scale-110 transition-transform`;

    const getInitials = (name) => {
        if (!name || name === 'Guest') return 'G';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    return (
        <aside className="w-20 lg:w-72 hidden md:flex flex-col border-r border-white/10 bg-background-dark p-6 justify-between flex-shrink-0">
            <div className="flex flex-col gap-8">
                <Link to="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <div className="bg-primary/20 flex items-center justify-center rounded-full size-10 text-primary shrink-0">
                        <span className="material-symbols-outlined">graphic_eq</span>
                    </div>
                    <div className="flex flex-col hidden lg:flex">
                        <h1 className="text-white text-lg font-bold leading-tight">MeetingAI</h1>
                        <p className="text-white/60 text-xs font-normal">Smart Summaries</p>
                    </div>
                </Link>

                <nav className="flex flex-col gap-2">
                    <Link to="/dashboard" className={getLinkClass('/dashboard')}>
                        <span className={getIconClass('/dashboard')}>dashboard</span>
                        <span className="text-sm font-medium hidden lg:block">Dashboard</span>
                    </Link>
                    <Link to="/new-session" className={getLinkClass('/new-session')}>
                        <span className={getIconClass('/new-session')}>add_circle</span>
                        <span className="text-sm font-medium hidden lg:block">New Session</span>
                    </Link>
                    <Link to="/dashboard" className={getLinkClass('/dashboard')}>
                        <span className={getIconClass('/dashboard')}>history</span>
                        <span className="text-sm font-medium hidden lg:block">Meeting History</span>
                    </Link>
                    <Link to="/chat" className={getLinkClass('/chat')}>
                        <span className={getIconClass('/chat')}>chat</span>
                        <span className="text-sm font-medium hidden lg:block">Chat</span>
                    </Link>
                    <Link to="/export" className={getLinkClass('/export')}>
                        <span className={getIconClass('/export')}>ios_share</span>
                        <span className="text-sm font-medium hidden lg:block">Export</span>
                    </Link>
                </nav>
            </div>

            <div className="flex flex-col gap-3">
                <div className={`flex items-center gap-3 px-2 lg:px-4 py-3 rounded-2xl border transition-colors ${active === '/profile' ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5'}`}>
                    <div className="bg-primary/10 flex items-center justify-center rounded-full size-10 shrink-0 border border-primary/20 text-primary font-bold">
                        {getInitials(userName)}
                    </div>
                    <div className="flex flex-col hidden lg:flex overflow-hidden">
                        <p className="text-white text-sm font-bold truncate">{userName}</p>
                        <p className="text-white/40 text-[10px] uppercase tracking-wider">{userName === 'Guest' ? 'Guest Access' : 'Pro Account'}</p>
                    </div>
                </div>
                <button
                    onClick={async () => {
                        if (window.electronAPI) {
                            await window.electronAPI.logout();
                            window.location.href = '#/login'; // Redirect to login
                        }
                    }}
                    className="flex lg:w-full items-center justify-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-4 py-3 rounded-xl transition-colors text-sm font-bold"
                >
                    <span className="material-symbols-outlined">logout</span>
                    <span className="hidden lg:block">{userName === 'Guest' ? 'Exit Guest' : 'Sign Out'}</span>
                </button>
            </div>
        </aside>
    );
}
