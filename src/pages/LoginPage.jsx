import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import BackButton from '../components/BackButton';

export default function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');

    // Load remembered email on mount
    useState(() => {
        const savedEmail = localStorage.getItem('rememberedEmail');
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        // Call Electron API for login
        if (window.electronAPI) {
            const result = await window.electronAPI.login({ email, password });
            if (result.success) {
                // Handle Remember Me
                if (rememberMe) {
                    localStorage.setItem('rememberedEmail', email);
                } else {
                    localStorage.removeItem('rememberedEmail');
                }

                // Set session in main process
                await window.electronAPI.setSession(result.user.id);
                navigate('/dashboard');
            } else {
                setError(result.error || 'Login failed');
            }
        } else {
            // Fallback for web development
            navigate('/dashboard');
        }
    };

    const handleGoogleLogin = async () => {
        console.log('🔵 Google Login button clicked');
        setError('');
        if (window.electronAPI) {
            try {
                const result = await window.electronAPI.googleLogin();
                if (result.success) {
                    console.log('✅ Google Login success, navigating to dashboard...');
                    // Ensure session is set before navigating
                    await window.electronAPI.setSession(result.user.id);
                    navigate('/dashboard');
                } else {
                    setError('Google Login failed: ' + (result.error || 'Unknown error'));
                }
            } catch (err) {
                console.error('❌ Error during Google Login IPC:', err);
                setError('An error occurred during Google Login.');
            }
        } else {
            setError('Desktop-only feature: Google Sign-In is only available in the Desktop App.');
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white h-screen flex flex-col md:flex-row overflow-hidden">
            <div className="hidden md:flex md:w-1/2 relative bg-surface-dark flex-col justify-between p-8 lg:p-12 overflow-hidden">
                <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay">
                    <div className="w-full h-full bg-center bg-cover" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBQNn0orVWFYs1oZHDZbqqKkt9o9ZSCufygEqAAQle8ivTA1ZcPRKP-ph8FmFbS61xFSZ3YaQ-TZGTSoJ3rMjnEzZutdHrG0mH8FjVx3xx72uo7v97cakU4FpwgkhlMI1_H_P2TWNUfzcsnfBQmi9_GpPndaqlmhS4h6P2TpE9BjQGSgODReXx6_L6JwFvLRfSW8BTAymWXGA-wi6eEY3sI73eT-cmuzU6mG8lAwVDmpQzuPuuu9j5XyjSxt_pNl_7z4yRftK8B0Hu3')" }}></div>
                </div>
                <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent to-background-dark/90"></div>
                <div className="relative z-10 flex items-center gap-4">
                    <BackButton className="bg-white/10 border-white/20" />
                    <div className="flex items-center gap-3">
                        <div className="size-10 bg-primary/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-primary border border-primary/30">
                            <span className="material-symbols-outlined text-2xl">graphic_eq</span>
                        </div>
                        <h2 className="text-white text-xl font-bold tracking-tight">MeetingAI</h2>
                    </div>
                </div>
                <div className="relative z-10 max-w-lg mt-auto mb-8">
                    <h1 className="text-3xl lg:text-5xl font-bold leading-tight mb-4 tracking-tight text-white">
                        Unlock Meeting <br />
                        <span className="text-primary">Intelligence</span>
                    </h1>
                    <p className="text-base text-gray-300 font-normal leading-relaxed mb-6">
                        Join thousands of teams saving time with AI-powered meeting notes, sentiment analysis, and instant action items.
                    </p>
                </div>
            </div>
            <div className="flex-1 w-full md:w-1/2 flex flex-col items-center justify-center p-4 sm:p-8 lg:p-16 bg-background-light dark:bg-background-dark transition-colors duration-300">
                <div className="w-full max-w-md space-y-6">
                    <div className="text-center space-y-1">
                        <h2 className="text-xl font-bold dark:text-white">Welcome Back</h2>
                        <p className="text-slate-500 dark:text-gray-400 text-sm">Please enter your details to sign in.</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2 text-red-500">
                            <span className="material-symbols-outlined text-base">error</span>
                            <p className="text-xs font-medium">{error}</p>
                        </div>
                    )}

                    <div className="space-y-3 pt-2">
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/10 py-3 rounded-full text-sm font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                        >
                            <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-4 h-4" alt="Google" />
                            <span className="dark:text-white">Continue with Google</span>
                        </button>

                        <div className="relative flex items-center py-1">
                            <div className="flex-grow border-t border-gray-200 dark:border-white/10"></div>
                            <span className="flex-shrink mx-3 text-gray-400 text-[10px] font-medium uppercase tracking-wider">Or email</span>
                            <div className="flex-grow border-t border-gray-200 dark:border-white/10"></div>
                        </div>
                    </div>

                    <form className="space-y-4" onSubmit={handleLogin}>
                        <div className="space-y-1">
                            <label className="text-xs font-medium ml-1 dark:text-gray-300">Email Address</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span className="material-symbols-outlined text-gray-400 group-focus-within:text-primary transition-colors text-lg">mail</span>
                                </div>
                                <input
                                    className="block w-full pl-11 pr-4 py-3 bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/10 rounded-full text-sm placeholder-gray-400 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm"
                                    placeholder="name@company.com"
                                    type="email"
                                    name="email"
                                    value={email}
                                    onChange={(e) => { setError(''); setEmail(e.target.value); }}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium ml-1 dark:text-gray-300">Password</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span className="material-symbols-outlined text-gray-400 group-focus-within:text-primary transition-colors text-lg">lock</span>
                                </div>
                                <input
                                    className="block w-full pl-11 pr-12 py-3 bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/10 rounded-full text-sm placeholder-gray-400 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm"
                                    placeholder="••••••••"
                                    type="password"
                                    name="password"
                                    value={password}
                                    onChange={(e) => { setError(''); setPassword(e.target.value); }}
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between px-2 pt-1">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="size-4 rounded border-gray-300 text-primary focus:ring-primary bg-transparent"
                                />
                                <span className="text-xs font-medium text-slate-500 dark:text-gray-400 group-hover:text-primary transition-colors">Remember Me</span>
                            </label>
                            <Link to="/forgot-password" size="tiny" className="text-xs font-medium text-primary hover:text-primary-hover transition-colors">
                                Forgot Password?
                            </Link>
                        </div>
                        <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-background-dark font-bold py-3 rounded-full transition-transform active:scale-[0.98] shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                            <span>Sign In</span>
                            <span className="material-symbols-outlined text-lg">arrow_forward</span>
                        </button>
                    </form>
                    <div className="pt-2 gap-2 flex flex-col items-center">
                        <Link to="/guest" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-gray-400 hover:text-primary transition-colors group">
                            Join meeting as Guest
                            <span className="material-symbols-outlined text-[14px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </Link>
                        <div className="text-xs text-slate-500 dark:text-gray-400">
                            Don't have an account?{' '}
                            <Link to="/register" className="font-semibold text-primary hover:text-primary-hover transition-colors">
                                Sign up
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
