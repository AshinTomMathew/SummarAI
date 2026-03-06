import { useState, useEffect } from 'react';

export default function WordMatchGame({ transcript, summary, onClose }) {
    const [words, setWords] = useState([]);
    const [definitions, setDefinitions] = useState([]);
    const [selectedWord, setSelectedWord] = useState(null);
    const [selectedDef, setSelectedDef] = useState(null);
    const [matched, setMatched] = useState([]);
    const [score, setScore] = useState(0);
    const [gameComplete, setGameComplete] = useState(false);

    useEffect(() => {
        generatePairs();
    }, [transcript, summary]);

    const generatePairs = () => {
        const content = summary || transcript;
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 30);

        const pairs = [];
        const usedWords = new Set();

        // Extract key phrases and their context
        for (const sentence of sentences.slice(0, 10)) {
            const words = sentence.trim().split(' ').filter(w => w.length > 4);
            if (words.length < 5) continue;

            // Find a good keyword (capitalized or longer words)
            const keyword = words.find(w =>
                w.length > 5 &&
                !usedWords.has(w.toLowerCase()) &&
                !/^(the|and|but|for|with|from|that|this|have|been|were|will)$/i.test(w)
            );

            if (keyword && pairs.length < 6) {
                usedWords.add(keyword.toLowerCase());
                // Use part of the sentence as definition
                const defWords = words.filter(w => w !== keyword).slice(0, 6);
                pairs.push({
                    word: keyword,
                    definition: defWords.join(' ') + '...'
                });
            }
        }

        // Shuffle
        const shuffledWords = pairs.map(p => p.word).sort(() => Math.random() - 0.5);
        const shuffledDefs = pairs.map(p => p.definition).sort(() => Math.random() - 0.5);

        setWords(shuffledWords);
        setDefinitions(shuffledDefs);
    };

    const handleWordClick = (word, index) => {
        if (matched.includes(index)) return;
        setSelectedWord({ word, index });
    };

    const handleDefClick = (def, index) => {
        if (matched.includes(index)) return;
        setSelectedDef({ def, index });
    };

    useEffect(() => {
        if (selectedWord && selectedDef) {
            // Check if they match
            const wordIndex = words.indexOf(selectedWord.word);
            const defIndex = definitions.indexOf(selectedDef.def);

            // They match if they were originally paired
            const isMatch = words[wordIndex] && definitions[defIndex] &&
                definitions[defIndex].toLowerCase().includes(words[wordIndex].toLowerCase().substring(0, 4));

            if (isMatch || wordIndex === defIndex) {
                setMatched([...matched, selectedWord.index, selectedDef.index]);
                setScore(score + 10);

                if (matched.length + 2 >= words.length + definitions.length) {
                    setTimeout(() => setGameComplete(true), 500);
                }
            }

            setTimeout(() => {
                setSelectedWord(null);
                setSelectedDef(null);
            }, 800);
        }
    }, [selectedWord, selectedDef]);

    const resetGame = () => {
        setMatched([]);
        setScore(0);
        setGameComplete(false);
        setSelectedWord(null);
        setSelectedDef(null);
        generatePairs();
    };

    if (words.length === 0) {
        return (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
                <div className="bg-[#0f1a0b] rounded-3xl border border-primary/30 p-8 max-w-2xl w-full text-center">
                    <div className="size-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white font-bold">Extracting key terms...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
            <div className="bg-[#0f1a0b] rounded-3xl border border-primary/30 p-8 max-w-4xl w-full">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-wider">Word Match</h2>
                        <p className="text-primary text-sm font-bold">Match terms with their context • Score: {score}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white size-10 rounded-xl transition-all flex items-center justify-center"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {!gameComplete ? (
                    <div className="grid grid-cols-2 gap-6">
                        {/* Words Column */}
                        <div className="space-y-3">
                            <h3 className="text-white/60 text-sm font-bold uppercase">Key Terms</h3>
                            {words.map((word, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleWordClick(word, idx)}
                                    disabled={matched.includes(idx)}
                                    className={`w-full p-4 rounded-xl font-bold text-left transition-all ${matched.includes(idx)
                                            ? 'bg-green-500/20 text-green-400 cursor-not-allowed'
                                            : selectedWord?.index === idx
                                                ? 'bg-primary text-black scale-105'
                                                : 'bg-[#152211] text-white hover:bg-primary/20'
                                        }`}
                                >
                                    {word}
                                </button>
                            ))}
                        </div>

                        {/* Definitions Column */}
                        <div className="space-y-3">
                            <h3 className="text-white/60 text-sm font-bold uppercase">Context</h3>
                            {definitions.map((def, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleDefClick(def, idx)}
                                    disabled={matched.includes(words.length + idx)}
                                    className={`w-full p-4 rounded-xl text-sm text-left transition-all ${matched.includes(words.length + idx)
                                            ? 'bg-green-500/20 text-green-400 cursor-not-allowed'
                                            : selectedDef?.index === words.length + idx
                                                ? 'bg-primary text-black scale-105'
                                                : 'bg-[#152211] text-white hover:bg-primary/20'
                                        }`}
                                >
                                    {def}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center space-y-6">
                        <div className="size-24 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-6xl">check_circle</span>
                        </div>
                        <h3 className="text-white text-3xl font-black">All Matched!</h3>
                        <p className="text-primary text-2xl font-bold">Final Score: {score}</p>
                        <p className="text-white/60">Great job matching all the key terms!</p>
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={resetGame}
                                className="bg-primary text-black px-6 py-3 rounded-xl font-bold hover:bg-primary/80 transition-colors"
                            >
                                Play Again
                            </button>
                            <button
                                onClick={onClose}
                                className="bg-white/10 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
