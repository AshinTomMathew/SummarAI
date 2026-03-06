import { useState } from 'react';
import SnakeGame from './SnakeGame';
import QuizGame from './QuizGame';
import WordMatchGame from './WordMatchGame';

export default function GameSelector({ transcript, summary, onClose }) {
    const [selectedGame, setSelectedGame] = useState(null);

    if (selectedGame === 'snake') {
        return <SnakeGame onClose={() => setSelectedGame(null)} />;
    }

    if (selectedGame === 'quiz') {
        return <QuizGame transcript={transcript} summary={summary} onClose={() => setSelectedGame(null)} />;
    }

    if (selectedGame === 'wordmatch') {
        return <WordMatchGame transcript={transcript} summary={summary} onClose={() => setSelectedGame(null)} />;
    }

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
            <div className="bg-[#0f1a0b] rounded-3xl border border-primary/30 p-8 max-w-4xl w-full">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-wider">Learning Games</h2>
                        <p className="text-primary text-sm font-bold mt-1">Test your knowledge while having fun!</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white size-12 rounded-xl transition-all flex items-center justify-center"
                    >
                        <span className="material-symbols-outlined text-2xl">close</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Content Quiz */}
                    <button
                        onClick={() => setSelectedGame('quiz')}
                        className="group bg-gradient-to-br from-[#152211] to-[#0d160b] rounded-2xl p-6 border border-primary/20 hover:border-primary transition-all hover:scale-105"
                    >
                        <div className="size-16 mx-auto mb-4 bg-primary/20 rounded-2xl flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                            <span className="material-symbols-outlined text-primary text-4xl">quiz</span>
                        </div>
                        <h3 className="text-white font-black text-lg mb-2">Content Quiz</h3>
                        <p className="text-white/60 text-sm">Answer questions generated from your meeting content</p>
                        <div className="mt-4 flex items-center justify-center gap-2 text-primary text-xs font-bold">
                            <span className="material-symbols-outlined text-sm">psychology</span>
                            Test Knowledge
                        </div>
                    </button>

                    {/* Word Match */}
                    <button
                        onClick={() => setSelectedGame('wordmatch')}
                        className="group bg-gradient-to-br from-[#152211] to-[#0d160b] rounded-2xl p-6 border border-primary/20 hover:border-primary transition-all hover:scale-105"
                    >
                        <div className="size-16 mx-auto mb-4 bg-primary/20 rounded-2xl flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                            <span className="material-symbols-outlined text-primary text-4xl">match_word</span>
                        </div>
                        <h3 className="text-white font-black text-lg mb-2">Word Match</h3>
                        <p className="text-white/60 text-sm">Match key terms with their context from the session</p>
                        <div className="mt-4 flex items-center justify-center gap-2 text-primary text-xs font-bold">
                            <span className="material-symbols-outlined text-sm">link</span>
                            Match Terms
                        </div>
                    </button>

                    {/* Snake Game */}
                    <button
                        onClick={() => setSelectedGame('snake')}
                        className="group bg-gradient-to-br from-[#152211] to-[#0d160b] rounded-2xl p-6 border border-primary/20 hover:border-primary transition-all hover:scale-105"
                    >
                        <div className="size-16 mx-auto mb-4 bg-primary/20 rounded-2xl flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                            <span className="material-symbols-outlined text-primary text-4xl">sports_esports</span>
                        </div>
                        <h3 className="text-white font-black text-lg mb-2">Snake Game</h3>
                        <p className="text-white/60 text-sm">Classic arcade game for quick brain breaks</p>
                        <div className="mt-4 flex items-center justify-center gap-2 text-primary text-xs font-bold">
                            <span className="material-symbols-outlined text-sm">gamepad</span>
                            Just For Fun
                        </div>
                    </button>
                </div>

                <div className="mt-8 p-4 bg-primary/10 rounded-xl border border-primary/20">
                    <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-primary text-xl">lightbulb</span>
                        <div>
                            <p className="text-white font-bold text-sm">Pro Tip:</p>
                            <p className="text-white/60 text-xs mt-1">
                                Content-based games (Quiz & Word Match) use actual content from this session to help reinforce learning!
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
