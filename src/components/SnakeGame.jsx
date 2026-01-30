import { useState, useEffect } from 'react';

export default function SnakeGame({ onClose }) {
    const [snake, setSnake] = useState([[10, 10]]);
    const [food, setFood] = useState([15, 15]);
    const [direction, setDirection] = useState('RIGHT');
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    const gridSize = 20;
    const cellSize = 20;

    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.key === ' ') {
                setIsPaused(p => !p);
                return;
            }

            switch (e.key) {
                case 'ArrowUp':
                    if (direction !== 'DOWN') setDirection('UP');
                    break;
                case 'ArrowDown':
                    if (direction !== 'UP') setDirection('DOWN');
                    break;
                case 'ArrowLeft':
                    if (direction !== 'RIGHT') setDirection('LEFT');
                    break;
                case 'ArrowRight':
                    if (direction !== 'LEFT') setDirection('RIGHT');
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [direction]);

    useEffect(() => {
        if (gameOver || isPaused) return;

        const moveSnake = () => {
            setSnake(prevSnake => {
                const newSnake = [...prevSnake];
                const head = [...newSnake[0]];

                switch (direction) {
                    case 'UP': head[1]--; break;
                    case 'DOWN': head[1]++; break;
                    case 'LEFT': head[0]--; break;
                    case 'RIGHT': head[0]++; break;
                }

                // Check wall collision
                if (head[0] < 0 || head[0] >= gridSize || head[1] < 0 || head[1] >= gridSize) {
                    setGameOver(true);
                    return prevSnake;
                }

                // Check self collision
                if (newSnake.some(segment => segment[0] === head[0] && segment[1] === head[1])) {
                    setGameOver(true);
                    return prevSnake;
                }

                newSnake.unshift(head);

                // Check food collision
                if (head[0] === food[0] && head[1] === food[1]) {
                    setScore(s => s + 10);
                    setFood([
                        Math.floor(Math.random() * gridSize),
                        Math.floor(Math.random() * gridSize)
                    ]);
                } else {
                    newSnake.pop();
                }

                return newSnake;
            });
        };

        const interval = setInterval(moveSnake, 150);
        return () => clearInterval(interval);
    }, [direction, food, gameOver, isPaused]);

    const resetGame = () => {
        setSnake([[10, 10]]);
        setFood([15, 15]);
        setDirection('RIGHT');
        setGameOver(false);
        setScore(0);
        setIsPaused(false);
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
            <div className="bg-[#0f1a0b] rounded-3xl border border-primary/30 p-8 max-w-2xl w-full">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-wider">Snake Game</h2>
                        <p className="text-primary text-sm font-bold">Score: {score}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white size-10 rounded-xl transition-all flex items-center justify-center"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex justify-center mb-4">
                    <div
                        style={{
                            width: gridSize * cellSize,
                            height: gridSize * cellSize,
                            border: '2px solid #46ec13'
                        }}
                        className="bg-[#0d160b] relative rounded-lg overflow-hidden"
                    >
                        {/* Snake */}
                        {snake.map((segment, i) => (
                            <div
                                key={i}
                                style={{
                                    position: 'absolute',
                                    left: segment[0] * cellSize,
                                    top: segment[1] * cellSize,
                                    width: cellSize - 2,
                                    height: cellSize - 2,
                                    backgroundColor: i === 0 ? '#46ec13' : '#2c4823',
                                    borderRadius: '2px'
                                }}
                            />
                        ))}

                        {/* Food */}
                        <div
                            style={{
                                position: 'absolute',
                                left: food[0] * cellSize,
                                top: food[1] * cellSize,
                                width: cellSize - 2,
                                height: cellSize - 2,
                                backgroundColor: '#ff4444',
                                borderRadius: '50%'
                            }}
                        />

                        {/* Game Over Overlay */}
                        {gameOver && (
                            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
                                <h3 className="text-white text-3xl font-black mb-4">GAME OVER!</h3>
                                <p className="text-primary text-xl font-bold mb-6">Final Score: {score}</p>
                                <button
                                    onClick={resetGame}
                                    className="bg-primary text-black px-6 py-3 rounded-xl font-bold hover:bg-primary/80 transition-colors"
                                >
                                    Play Again
                                </button>
                            </div>
                        )}

                        {/* Pause Overlay */}
                        {isPaused && !gameOver && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <h3 className="text-white text-2xl font-black">PAUSED</h3>
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-center text-white/60 text-sm space-y-1">
                    <p>Use <span className="text-primary font-bold">Arrow Keys</span> to move</p>
                    <p>Press <span className="text-primary font-bold">Space</span> to pause</p>
                </div>
            </div>
        </div>
    );
}
