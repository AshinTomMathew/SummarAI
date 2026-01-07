import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Logo from '../components/Logo';

export default function DashboardPage() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSessions = async () => {
            if (window.electronAPI) {
                // Determine user ID from main process session
                const userId = await window.electronAPI.getActiveId();
                const result = await window.electronAPI.getSessions(userId || 1);
                if (result.success) {
                    setSessions(result.sessions);
                }
            }
            setLoading(false);
        };
        fetchSessions();
    }, []);

    return (
        <div className="flex h-screen w-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display overflow-hidden">
            <Sidebar active="/dashboard" />
            <main className="flex-1 flex flex-col h-full overflow-y-auto relative scroll-smooth">
                <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-background-dark sticky top-0 z-20">
                    <Logo />
                    <button className="text-white p-2">
                        <span className="material-symbols-outlined">menu</span>
                    </button>
                </div>
                <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 flex flex-col gap-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex flex-col gap-2">
                            <h2 className="text-white text-3xl md:text-4xl font-black leading-tight tracking-tight">Good Morning</h2>
                            <p className="text-white/60 text-base font-normal">You have analyzed <span className="text-primary font-bold">{sessions.length} meetings</span> so far.</p>
                        </div>
                        <Link to="/new-session" className="group flex items-center gap-2 bg-primary hover:bg-[#3bdb0f] active:scale-95 transition-all cursor-pointer rounded-full h-12 px-6 text-background-dark text-sm font-bold shadow-[0_0_20px_rgba(70,236,19,0.3)] hover:shadow-[0_0_30px_rgba(70,236,19,0.5)]">
                            <span className="material-symbols-outlined text-[20px]">mic</span>
                            <span>Start New Session</span>
                        </Link>
                    </div>

                    {/* Stats Cards */}
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
                        <h3 className="text-white text-xl font-bold">Recent Sessions</h3>
                        {loading ? (
                            <p className="text-white/50">Loading sessions...</p>
                        ) : sessions.length === 0 ? (
                            <div className="bg-surface-dark rounded-xl p-8 text-center border border-white/5">
                                <p className="text-white/50 mb-4">No sessions found. Start a new analysis to see results here!</p>
                                <Link to="/new-session" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 px-6 py-2 rounded-full text-white font-medium transition-colors">
                                    Start Analysis
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {sessions.map(session => (
                                    <Link key={session.id} to="/transcript" state={session} className="group flex flex-col sm:flex-row gap-4 rounded-2xl bg-surface-dark p-4 border border-white/5 hover:border-primary/20 transition-all shadow-sm">
                                        <div className="w-full sm:w-40 aspect-video sm:aspect-square rounded-xl bg-cover bg-center shrink-0 relative overflow-hidden" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCAkEcUKWKPkbRU4oe8zNdCo8oJEv7Zh6jC7p7g4MOxZ2DgaJXZ0cLCGi5L0YlH5d7T7bNe2XTUaK7O_w12v-lje6T4xhImZUq5QaLXwZUydqxK_3fPUH__K9dulofTmOqtvyFoEAK-6wGgn1cjCaRG_TH0U1-0lqLdT4cSeLgjG1tHgzNwY7ejV9BW6tXOj-9oopC0-UYStl6sqDQMRx4VX_xfClFHMxlA6T82t3AcZj4SyvAhnvY-l6dGhbx3ksHvCESk1zjJRNcM")' }}>
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent sm:bg-black/20 sm:group-hover:bg-transparent transition-colors"></div>
                                        </div>
                                        <div className="flex flex-col justify-between flex-1 py-1">
                                            <div>
                                                <div className="flex justify-between items-start mb-1 gap-2">
                                                    <h4 className="text-white text-lg font-bold leading-tight line-clamp-1">{session.title}</h4>
                                                    <div className="bg-primary/10 text-primary text-[10px] uppercase font-bold px-2 py-1 rounded-full shrink-0">{session.classification || 'General'}</div>
                                                </div>
                                                <p className="text-white/60 text-sm mb-4">{new Date(session.date).toLocaleString()}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button className="flex-1 cursor-pointer items-center justify-center rounded-full h-9 px-4 bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors border border-white/5">View Summary</button>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
