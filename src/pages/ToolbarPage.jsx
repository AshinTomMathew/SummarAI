import React, { useState, useEffect } from 'react';

export default function ToolbarPage() {
    const [drawing, setDrawing] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        const ogClasses = document.body.className;
        document.body.className = '';
        document.body.style.backgroundColor = 'transparent';

        return () => {
            document.body.className = ogClasses;
            document.body.style.backgroundColor = '';
        };
    }, []);

    const toggleDrawing = async () => {
        if (!window.electronAPI) return;
        if (drawing) {
            await window.electronAPI.hideDrawingOverlay();
        } else {
            await window.electronAPI.showDrawingOverlay();
        }
        setDrawing(!drawing);
    };

    const takeScreenshot = async () => {
        if (!window.electronAPI) return;
        const result = await window.electronAPI.takeScreenshot();
        if (result && result.success) {
            // Optional: nice little animation or feedback sound could happen here
            console.log("Screenshot saved to:", result.path);

            // Temporary popup using native notification
            new Notification('SummarAI', { body: 'Screenshot Saved to Desktop', icon: result.path });
        }
    };

    const triggerPause = () => {
        if (!window.electronAPI) return;
        const newStatus = !isPaused;
        setIsPaused(newStatus);
        window.electronAPI.triggerPauseRecordingSender(newStatus);
    };

    const triggerStop = () => {
        if (!window.electronAPI) return;
        window.electronAPI.triggerStopRecordingSender();
    };

    return (
        <div className="w-full h-screen flex items-center justify-center bg-transparent overflow-hidden select-none">
            <div
                className="flex items-center justify-center gap-[18px] px-6 h-12 bg-black/80 backdrop-blur-md rounded-full border border-white/20 shadow-2xl transition-all"
                style={{ WebkitAppRegion: 'drag' }}
            >
                {/* Recording Indicator */}
                <div className="flex items-center gap-2 pr-2 border-r border-white/10 shrink-0">
                    <div className={`size-2.5 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`}></div>
                    <span className="text-white font-bold text-xs tracking-wider" style={{ WebkitAppRegion: 'no-drag' }}>{isPaused ? 'PAUSED' : 'REC'}</span>
                </div>

                {/* Pause Button */}
                <button
                    onClick={triggerPause}
                    className={`flex items-center justify-center transition-colors size-8 rounded-full ${isPaused ? 'bg-yellow-500/20 text-yellow-500' : 'text-white hover:bg-white/10'} active:scale-95`}
                    style={{ WebkitAppRegion: 'no-drag' }}
                    title={isPaused ? "Resume Recording" : "Pause Recording"}
                >
                    <span className="material-symbols-outlined text-[18px]">{isPaused ? 'play_arrow' : 'pause'}</span>
                </button>

                {/* Mark/Draw Button */}
                <button
                    onClick={toggleDrawing}
                    className={`flex items-center justify-center transition-colors size-8 rounded-full ${drawing ? 'bg-primary/20 text-primary' : 'text-white hover:bg-white/10'} active:scale-95`}
                    style={{ WebkitAppRegion: 'no-drag' }}
                    title={drawing ? "Stop Marking" : "Mark Screen"}
                >
                    <span className="material-symbols-outlined text-[18px]">draw</span>
                </button>

                {/* Screenshot Button */}
                <button
                    onClick={takeScreenshot}
                    className="flex items-center justify-center transition-colors text-white hover:bg-white/10 size-8 rounded-full active:scale-95"
                    style={{ WebkitAppRegion: 'no-drag' }}
                    title="Take Screenshot"
                >
                    <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                </button>

                {/* Stop Recording Button */}
                <button
                    onClick={triggerStop}
                    className="flex items-center justify-center transition-colors text-white hover:bg-red-500/20 hover:text-red-500 size-8 rounded-full active:scale-95 ml-1"
                    style={{ WebkitAppRegion: 'no-drag' }}
                    title="Stop & Analyze Recording"
                >
                    <span className="material-symbols-outlined text-[20px] filled">stop_circle</span>
                </button>
            </div>
        </div>
    );
}
