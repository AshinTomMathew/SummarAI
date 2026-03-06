import { useEffect } from 'react';

export default function LiquidGlassPopup({ isOpen, onClose, message, type = 'success' }) {
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                onClose();
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const iconMap = {
        success: 'check_circle',
        error: 'error',
        info: 'info'
    };

    const colorMap = {
        success: 'text-primary',
        error: 'text-red-400',
        info: 'text-blue-400'
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
                onClick={onClose}
            />
            
            {/* Liquid Glass Popup */}
            <div className="relative z-10 pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="relative">
                    {/* Glass morphism effect */}
                    <div className="relative bg-gradient-to-br from-[#1a2c15]/90 via-[#162512]/95 to-[#0f1a0d]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                        {/* Animated gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 animate-pulse" />
                        
                        {/* Shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />
                        
                        {/* Content */}
                        <div className="relative p-6 min-w-[320px] max-w-md">
                            <div className="flex items-start gap-4">
                                <div className={`flex-shrink-0 ${colorMap[type]}`}>
                                    <span className="material-symbols-outlined text-4xl">
                                        {iconMap[type]}
                                    </span>
                                </div>
                                <div className="flex-1 pt-1">
                                    <p className="text-white font-medium text-base leading-relaxed whitespace-pre-line">
                                        {message}
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="flex-shrink-0 text-white/40 hover:text-white transition-colors"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        </div>
                        
                        {/* Bottom accent line */}
                        <div className="h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                    </div>
                    
                    {/* Glow effect */}
                    <div className="absolute -inset-1 bg-primary/20 blur-xl opacity-50 -z-10 animate-pulse" />
                </div>
            </div>
        </div>
    );
}
