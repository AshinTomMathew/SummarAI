import React from 'react';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop with strong blur for glass effect */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
                onClick={onCancel}
            ></div>

            {/* Liquid Glass Modal Content */}
            <div className="relative animate-in zoom-in-95 duration-200 ease-out flex w-full max-w-sm flex-col overflow-hidden rounded-[2rem] border border-white/20 bg-surface-dark/60 bg-gradient-to-br from-white/10 to-transparent p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl">

                {/* Decorative glow behind modal */}
                <div className="absolute -top-10 -right-10 size-40 rounded-full bg-primary/20 blur-[50px] pointer-events-none"></div>
                <div className="absolute -bottom-10 -left-10 size-40 rounded-full bg-primary/10 blur-[50px] pointer-events-none"></div>

                <div className="relative z-10 flex flex-col items-center text-center gap-4">
                    <div className="flex size-14 items-center justify-center rounded-full bg-red-500/20 text-red-500 border border-red-500/30 shadow-inner">
                        <span className="material-symbols-outlined text-[28px]">warning</span>
                    </div>

                    <div className="flex flex-col gap-2">
                        <h3 className="text-xl font-bold text-white tracking-tight">{title || 'Confirm Action'}</h3>
                        <p className="text-sm text-white/70 leading-relaxed font-medium">
                            {message}
                        </p>
                    </div>

                    <div className="mt-4 flex w-full gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-white/20 active:scale-95 border border-white/5"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-sm font-bold text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all hover:bg-red-400 hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] active:scale-95"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
