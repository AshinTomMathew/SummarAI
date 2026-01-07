import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Logo from '../components/Logo';
import BackButton from '../components/BackButton';

export default function GuestModePage() {
    return (
        <div className="flex h-screen w-full bg-background-light dark:bg-background-dark text-[#152211] dark:text-white font-display overflow-hidden">
            <Sidebar active="/guest" />
            <main className="flex-1 flex flex-col h-full overflow-y-auto bg-background-light dark:bg-background-dark relative">
                <header className="lg:hidden flex items-center justify-between p-4 border-b border-surface-border bg-background-dark sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <BackButton />
                        <Logo />
                    </div>
                    <button className="text-white"><span className="material-symbols-outlined">menu</span></button>
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
                                    <p className="text-text-secondary text-sm font-normal leading-normal max-w-xl">
                                        For your privacy, all data will be deleted when you close this window.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <h1 className="text-white text-3xl md:text-4xl font-black tracking-tight">Start a new analysis</h1>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Link to="/new-session" className="group relative flex flex-col items-start gap-4 p-6 rounded-[2rem] bg-surface-dark border border-surface-border hover:border-primary transition-all text-left">
                            <div className="size-14 rounded-full bg-primary flex items-center justify-center text-background-dark group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-3xl">mic</span>
                            </div>
                            <div>
                                <h3 className="text-white text-xl font-bold mb-1">Record Meeting</h3>
                                <p className="text-text-secondary text-sm">Start a live recording and get real-time transcription.</p>
                            </div>
                        </Link>
                        <button className="group relative flex flex-col items-start gap-4 p-6 rounded-[2rem] bg-surface-dark border border-surface-border hover:border-white/20 transition-all text-left">
                            <div className="size-14 rounded-full bg-surface-border flex items-center justify-center text-white group-hover:bg-white group-hover:text-background-dark transition-colors">
                                <span className="material-symbols-outlined text-3xl">upload_file</span>
                            </div>
                            <div>
                                <h3 className="text-white text-xl font-bold mb-1">Upload Audio</h3>
                                <p className="text-text-secondary text-sm">Import MP3, WAV or M4A files.</p>
                            </div>
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
