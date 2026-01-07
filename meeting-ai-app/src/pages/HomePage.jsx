import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

export default function HomePage() {
    return (
        <div className="relative flex min-h-screen w-full flex-col group/design-root overflow-y-auto">
            <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-gray-200 dark:border-b-[#2c4823] px-6 py-4 lg:px-10 bg-background-light dark:bg-background-dark z-50">
                <Logo />
                <div className="flex flex-1 justify-end gap-6 items-center">
                    <div className="hidden md:flex items-center gap-6">
                        <a className="text-[#152211] dark:text-white text-sm font-medium hover:text-primary transition-colors" href="#">Features</a>
                        <a className="text-[#152211] dark:text-white text-sm font-medium hover:text-primary transition-colors" href="#">Pricing</a>
                        <a className="text-[#152211] dark:text-white text-sm font-medium hover:text-primary transition-colors" href="#">About</a>
                    </div>
                    <Link to="/login">
                        <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-5 bg-primary text-[#152211] text-sm font-bold hover:bg-opacity-90 transition-all">
                            <span className="truncate">Login / Sign Up</span>
                        </button>
                    </Link>
                </div>
            </header>
            <main className="layout-container flex h-full grow flex-col">
                <section className="flex flex-col items-center justify-center px-4 py-12 md:px-10 lg:px-20 xl:px-40">
                    <div className="layout-content-container flex flex-col max-w-[1200px] flex-1 w-full">
                        <div className="@container">
                            <div className="flex flex-col gap-10 py-10 lg:flex-row lg:items-center lg:gap-16">
                                <div className="flex flex-col gap-6 lg:w-1/2 lg:justify-center">
                                    <div className="flex flex-col gap-4 text-left">
                                        <h1 className="text-[#152211] dark:text-white text-4xl font-black leading-tight tracking-[-0.033em] md:text-5xl lg:text-6xl">
                                            AI Meeting Analyzer & <br /><span className="text-primary">Smart Summary</span> System
                                        </h1>
                                        <h2 className="text-[#4b5563] dark:text-[#9fc992] text-lg font-normal leading-relaxed md:text-xl">
                                            Turn conversations into actionable intelligence. Instant transcription, smart summaries, and chat analysis for your meetings.
                                        </h2>
                                    </div>
                                    <div className="flex flex-wrap gap-4 pt-2">
                                        <Link to="/guest">
                                            <button className="flex min-w-[140px] cursor-pointer items-center justify-center rounded-full h-12 px-6 bg-primary text-[#152211] text-base font-bold shadow-[0_0_20px_rgba(70,236,19,0.3)] hover:shadow-[0_0_30px_rgba(70,236,19,0.5)] transition-all hover:scale-105">
                                                <span className="truncate">Start as Guest</span>
                                            </button>
                                        </Link>
                                        <Link to="/login">
                                            <button className="flex min-w-[140px] cursor-pointer items-center justify-center rounded-full h-12 px-6 border-2 border-solid border-gray-300 dark:border-[#3f6732] bg-transparent text-[#152211] dark:text-white text-base font-bold hover:bg-gray-100 dark:hover:bg-[#1f3319] transition-all">
                                                <span className="truncate">Login / Sign Up</span>
                                            </button>
                                        </Link>
                                    </div>
                                </div>
                                <div className="w-full lg:w-1/2">
                                    <div className="w-full aspect-[4/3] rounded-2xl bg-surface-dark border border-surface-border overflow-hidden relative shadow-2xl">
                                        <div className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCcB1qQhfXFvjBgxkz_2nEz5WJJ1tiLLbPgwcEdoKdDUuiBpy53UuCLqsLP2-7ibGurejvL_4-a5HmPj36gpA009iKwVPblP5n9dLMzpQER59mTT2rtVc6GqyCbuR8Av8_QJIgzmq2EPQM_rt42B9tBpTMfjlUs624l5ve_CXUkeqYwl3RNxILAxn8t6BJQcKPeRrDpeDulkJlLQCaWEEDVOYDlHA240U1sJM3W6yc-Y5CzinfP_gzIHqhTwtNXKeTimjy_-d3Uuqn8")' }}></div>
                                        <div className="absolute inset-0 flex flex-col p-6 md:p-8">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                            </div>
                                            <div className="flex-1 flex flex-col gap-4">
                                                <div className="flex gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">AI</div>
                                                    <div className="p-3 rounded-lg rounded-tl-none bg-surface-border/30 text-white text-sm backdrop-blur-sm max-w-[85%]">
                                                        I've analyzed the 45-minute meeting. Here are the key action items:
                                                    </div>
                                                </div>
                                                <div className="flex gap-3 pl-11">
                                                    <div className="p-4 rounded-lg bg-surface-border/30 text-white text-sm backdrop-blur-sm w-full border border-primary/20">
                                                        <ul className="list-disc pl-4 space-y-2 text-[#9fc992]">
                                                            <li><span className="text-white font-medium">Marketing Team:</span> Finalize Q4 ad spend by Friday.</li>
                                                            <li><span className="text-white font-medium">Design:</span> Update landing page hero assets.</li>
                                                            <li><span className="text-white font-medium">Product:</span> Schedule user testing for v2.0 feature set.</li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
