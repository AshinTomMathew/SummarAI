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

    return (
        <aside className="w-20 lg:w-72 hidden md:flex flex-col border-r border-white/10 bg-background-dark p-6 justify-between flex-shrink-0">
            <div className="flex flex-col gap-8">
                <Link to="/" className="flex items-center gap-3">
                    <div className="bg-primary/20 flex items-center justify-center rounded-full size-10 text-primary shrink-0">
                        <span className="material-symbols-outlined">graphic_eq</span>
                    </div>
                    <div className="flex flex-col hidden lg:flex">
                        <h1 className="text-white text-lg font-bold leading-tight">Meeting AI</h1>
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
                    <Link to="/guest" className={getLinkClass('/guest')}>
                        <span className={getIconClass('/guest')}>history</span>
                        <span className="text-sm font-medium hidden lg:block">History (Guest)</span>
                    </Link>
                    <Link to="/transcript" className={getLinkClass('/transcript')}>
                        <span className={getIconClass('/transcript')}>description</span>
                        <span className="text-sm font-medium hidden lg:block">Transcript</span>
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

            <Link to="/profile" className={`flex items-center gap-3 px-2 lg:px-4 py-3 rounded-2xl border cursor-pointer transition-colors ${active === '/profile' ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                <div className="bg-center bg-no-repeat bg-cover rounded-full size-10 shrink-0 border border-white/10" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCfeRJm2VtxGu94qmC5085S4GF0l_yUsbqRiwaCxJyZZtzPb66f2QubWZ2yqhxyU4lbHkv32g5kQwl6x4pqxJkdaFAJSAUv20p8vpWahRpBTZcEE16l_Mlnim2YsFBIbyGWWMBQY__0zFL2MCxI9RPLX-DrWmovEoOXrymQ17q6bojretalwTH_U4dpMVPuBh9bFUQx2-p4V2WLky8-3C88CURyPKlBqLJWMLhzfJcttlKhX1jsDZiM4ujFGCDeOkWw71ciOQvKcaAz")' }}></div>
                <div className="flex flex-col hidden lg:flex">
                    <p className="text-white text-sm font-bold">{userName}</p>
                </div>
            </Link>
        </aside>
    );
}
