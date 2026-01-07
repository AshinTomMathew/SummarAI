import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import BackButton from '../components/BackButton';
import { useEffect, useState } from 'react';

export default function ProfilePage() {
    const navigate = useNavigate();
    const [user, setUser] = useState({ name: 'Guest', email: 'guest@example.com' });

    useEffect(() => {
        const loadUser = async () => {
            if (window.electronAPI) {
                const result = await window.electronAPI.getSessionUser();
                if (result.success) {
                    setUser(result.user);
                } else {
                    // Stay as guest or redirect if appropriate
                }
            }
        };
        loadUser();
    }, []);

    const handleLogout = async () => {
        if (window.electronAPI) {
            await window.electronAPI.logout();
        }
        // Redirect to login
        navigate('/login');
    };

    return (
        <div className="bg-background-light dark:bg-background-dark text-[#152211] dark:text-white font-display overflow-hidden h-screen flex">
            <Sidebar active="/profile" />
            <main className="flex-1 flex flex-col h-full relative overflow-y-auto w-full">
                <header className="flex items-center gap-4 px-6 py-8 md:px-12 md:py-12 pb-4">
                    <BackButton />
                    <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em] text-white">Your Profile</h1>
                </header>

                <div className="flex-1 px-6 md:px-12 pb-12">
                    <div className="max-w-2xl w-full bg-surface-dark border border-surface-border rounded-2xl p-8 shadow-xl">
                        <div className="flex items-center gap-6 mb-8">
                            <div className="size-24 rounded-full bg-gradient-to-br from-primary to-green-800 flex items-center justify-center text-background-dark text-3xl font-bold shadow-lg">
                                {user.name ? user.name.charAt(0).toUpperCase() : 'G'}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">{user.name}</h2>
                                <p className="text-text-secondary">{user.email}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-4 bg-background-dark/50 rounded-xl border border-white/5">
                                    <p className="text-xs text-text-secondary uppercase tracking-wider font-bold mb-1">Username</p>
                                    <p className="text-white font-medium">{user.name}</p>
                                </div>
                                <div className="p-4 bg-background-dark/50 rounded-xl border border-white/5">
                                    <p className="text-xs text-text-secondary uppercase tracking-wider font-bold mb-1">Email Address</p>
                                    <p className="text-white font-medium">{user.email}</p>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/10">
                                <button
                                    onClick={handleLogout}
                                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 font-bold py-3 px-8 rounded-xl transition-all"
                                >
                                    <span className="material-symbols-outlined">logout</span>
                                    Log Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
