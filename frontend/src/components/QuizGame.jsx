import { useState, useEffect } from 'react';

export default function QuizGame({ transcript, summary, onClose }) {
    const [questions, setQuestions] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [showResult, setShowResult] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [gameComplete, setGameComplete] = useState(false);

    useEffect(() => {
        // Generate questions from the content
        generateQuestions();
    }, [transcript, summary]);

    const generateQuestions = () => {
        // Extract key sentences and create questions
        const sentences = (summary || transcript).split(/[.!?]+/).filter(s => s.trim().length > 20);
        const generatedQuestions = [];

        // Create 5 questions
        for (let i = 0; i < Math.min(5, sentences.length); i++) {
            const sentence = sentences[i].trim();
            const words = sentence.split(' ').filter(w => w.length > 3);

            if (words.length < 5) continue;

            // Pick a random word to blank out
            const blankIndex = Math.floor(Math.random() * Math.min(words.length - 2, 10)) + 2;
            const correctAnswer = words[blankIndex];

            // Create wrong answers from other words
            const wrongAnswers = words
                .filter((w, idx) => idx !== blankIndex && w !== correctAnswer)
                .sort(() => Math.random() - 0.5)
                .slice(0, 3);

            const questionText = words.map((w, idx) =>
                idx === blankIndex ? '______' : w
            ).join(' ');

            const allAnswers = [correctAnswer, ...wrongAnswers]
                .sort(() => Math.random() - 0.5);

            generatedQuestions.push({
                question: questionText + '?',
                answers: allAnswers,
                correct: correctAnswer
            });
        }

        setQuestions(generatedQuestions);
    };

    const handleAnswer = (answer) => {
        setSelectedAnswer(answer);
        const correct = answer === questions[currentQuestion].correct;
        setIsCorrect(correct);
        setShowResult(true);

        if (correct) {
            setScore(score + 20);
        }

        setTimeout(() => {
            if (currentQuestion + 1 < questions.length) {
                setCurrentQuestion(currentQuestion + 1);
                setSelectedAnswer(null);
                setShowResult(false);
            } else {
                setGameComplete(true);
            }
        }, 1500);
    };

    const resetGame = () => {
        setCurrentQuestion(0);
        setScore(0);
        setSelectedAnswer(null);
        setShowResult(false);
        setGameComplete(false);
        generateQuestions();
    };

    if (questions.length === 0) {
        return (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
                <div className="bg-[#0f1a0b] rounded-3xl border border-primary/30 p-8 max-w-2xl w-full text-center">
                    <div className="size-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white font-bold">Generating quiz from your content...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
            <div className="bg-[#0f1a0b] rounded-3xl border border-primary/30 p-8 max-w-3xl w-full">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-wider">Content Quiz</h2>
                        <p className="text-primary text-sm font-bold">Test your knowledge from this session</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white size-10 rounded-xl transition-all flex items-center justify-center"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {!gameComplete ? (
                    <div className="space-y-6">
                        {/* Progress Bar */}
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-white/60">Question {currentQuestion + 1} of {questions.length}</span>
                            <span className="text-primary font-bold">Score: {score}</span>
                        </div>
                        <div className="h-2 bg-[#0d160b] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                            />
                        </div>

                        {/* Question */}
                        <div className="bg-[#0d160b] rounded-2xl p-6 border border-primary/10">
                            <p className="text-white text-lg leading-relaxed">
                                {questions[currentQuestion].question}
                            </p>
                        </div>

                        {/* Answers */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {questions[currentQuestion].answers.map((answer, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => !showResult && handleAnswer(answer)}
                                    disabled={showResult}
                                    className={`p-4 rounded-xl font-bold text-left transition-all ${showResult
                                            ? answer === questions[currentQuestion].correct
                                                ? 'bg-green-500 text-white'
                                                : answer === selectedAnswer
                                                    ? 'bg-red-500 text-white'
                                                    : 'bg-[#152211] text-white/40'
                                            : 'bg-[#152211] text-white hover:bg-primary hover:text-black'
                                        }`}
                                >
                                    <span className="text-primary/60 text-xs mr-2">{String.fromCharCode(65 + idx)}.</span>
                                    {answer}
                                </button>
                            ))}
                        </div>

                        {/* Feedback */}
                        {showResult && (
                            <div className={`p-4 rounded-xl text-center font-bold ${isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                }`}>
                                {isCorrect ? '✓ Correct! +20 points' : `✗ Wrong! Correct answer: ${questions[currentQuestion].correct}`}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center space-y-6">
                        <div className="size-24 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-6xl">emoji_events</span>
                        </div>
                        <h3 className="text-white text-3xl font-black">Quiz Complete!</h3>
                        <p className="text-primary text-2xl font-bold">Final Score: {score} / {questions.length * 20}</p>
                        <p className="text-white/60">
                            {score >= questions.length * 16 ? 'Excellent! You really understood the content!' :
                                score >= questions.length * 12 ? 'Good job! You got most of it!' :
                                    'Keep reviewing the content to improve!'}
                        </p>
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
