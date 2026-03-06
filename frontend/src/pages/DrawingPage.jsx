import React, { useRef, useEffect, useState } from 'react';

export default function DrawingPage() {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const ogClasses = document.body.className;
        document.body.className = '';
        document.body.style.backgroundColor = 'transparent';

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Auto-fit to screen
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const ctx = canvas.getContext('2d');
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#46EC13'; // Primary brand color

        const handleResize = () => {
            // We don't want to clear the canvas on resize, but usually a drawing overlay is static size.
            // Just keeping it simple for now as it's fullscreen.
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            document.body.className = ogClasses;
            document.body.style.backgroundColor = '';
        };
    }, []);

    const startDrawing = (e) => {
        const { offsetX, offsetY } = e.nativeEvent;
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = e.nativeEvent;
        const ctx = canvasRef.current.getContext('2d');
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        const ctx = canvasRef.current.getContext('2d');
        ctx.closePath();
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    return (
        <div className="w-screen h-screen bg-transparent relative overflow-hidden">
            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="cursor-crosshair w-full h-full bg-black/10 transition-colors pointer-events-auto"
            />
            {/* Simple Floating Controls for the Canvas */}
            <div className="absolute top-4 left-4 flex gap-2">
                <button onClick={clearCanvas} className="bg-black/80 text-white rounded-md px-3 py-1 text-sm border border-white/10 hover:bg-red-500/20 hover:border-red-500/50 transition-colors">
                    Clear Screen
                </button>
                <button onClick={() => window.electronAPI.hideDrawingOverlay()} className="bg-black/80 text-white rounded-md px-3 py-1 text-sm border border-white/10 hover:bg-white/20 transition-colors">
                    Exit Marking Mode
                </button>
            </div>
        </div>
    );
}
