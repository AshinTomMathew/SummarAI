import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import BackButton from '../components/BackButton';
import { useToast } from '../context/ToastContext';

const LiveBackground = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#050805]">
        <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] bg-primary/15 rounded-full blur-[120px] animate-blob"></div>
        <div className="absolute top-[30%] right-[-10%] w-[35%] h-[35%] bg-primary/10 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-10%] left-[10%] w-[45%] h-[45%] bg-primary/15 rounded-full blur-[150px] animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[60px]"></div>
    </div>
);

export default function ChatPage() {
    const location = useLocation();
    const [sessions, setSessions] = useState([]);
    const [isVaultOpen, setIsVaultOpen] = useState(false);
    const [currentSession, setCurrentSession] = useState(location.state || null);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const { showToast } = useToast();

    // Initial greeting and Message State
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const messagesEndRef = useRef(null);

    const [useVisualContext, setUseVisualContext] = useState(true);

    // Helper to sanitize titles
    const formatTitle = (title) => {
        if (!title) return 'Untitled Meeting';
        return title.replace(/^(compressed_|vid_\d+_)+/g, '').trim();
    };

    const [userIsGuest, setUserIsGuest] = useState(false);
    const [guestMsgCount, setGuestMsgCount] = useState(0);
    const GUEST_MSG_LIMIT = 5;

    // Fetch sessions on mount
    useEffect(() => {
        const fetchHistory = async () => {
            console.log("🔍 [CHAT] Syncing Meeting Vault...");
            if (window.electronAPI) {
                try {
                    const userId = await window.electronAPI.getActiveId();

                    if (!userId) {
                        setUserIsGuest(true);
                        console.log("🔍 [CHAT] Guest Mode: Loading local sessions...");
                        try {
                            const localSessions = JSON.parse(localStorage.getItem('guestSessions') || '[]');
                            setSessions(localSessions);
                            if (!currentSession && localSessions.length > 0) {
                                setCurrentSession(localSessions[0]);
                            }
                        } catch (e) {
                            console.error("❌ Guest history load failed:", e);
                        }
                    } else {
                        const result = await window.electronAPI.getSessions(userId);
                        let dbSessions = [];
                        if (result.success) {
                            dbSessions = result.sessions;
                        }
                        
                        // Merge fallback sessions for offline support
                        const fallbackKey = `fallbackSessions_${userId}`;
                        const fallback = JSON.parse(localStorage.getItem(fallbackKey) || '[]');
                        const mergedSessions = [...dbSessions];
                        for (const fs of fallback) {
                            if (!mergedSessions.find(s => s.id === fs.id)) mergedSessions.push(fs);
                        }
                        
                        setSessions(mergedSessions);
                        
                        // Pick the most recent one if no session passed via state
                        if (!currentSession && mergedSessions.length > 0) {
                            setCurrentSession(mergedSessions[0]);
                        }
                    }
                } catch (err) {
                    console.error("❌ [CHAT] Sync Failed:", err);
                }
            }
            setLoadingSessions(false);
        };
        fetchHistory();
    }, []);

    // Effect to handle session switching
    // Effect to handle session switching and message loading
    useEffect(() => {
        const loadMessages = async () => {
            if (currentSession) {
                console.log("🎯 [CHAT] Switched Context to:", formatTitle(currentSession.title));

                let initialMessages = [];
                let msgCount = 0;

                if (userIsGuest || currentSession.id.toString().startsWith('fallback_')) {
                    // GUEST or OFFLINE FALLBACK: Load from Local Storage
                    const localChat = JSON.parse(localStorage.getItem(`localChat_${currentSession.id}`) || '[]');
                    initialMessages = localChat;
                    msgCount = localChat.filter(m => m.sender === 'user').length;
                } else if (window.electronAPI && window.electronAPI.getChatHistory) {
                    // REGISTERED: Load from Database via IPC
                    try {
                        const result = await window.electronAPI.getChatHistory({
                            sessionId: currentSession.id,
                            userId: currentSession.user_id
                        });
                        if (result.success && result.history.length > 0) {
                            initialMessages = result.history;
                        }
                    } catch (err) {
                        console.error("Failed to load chat history:", err);
                    }
                }

                if (initialMessages.length === 0) {
                    setMessages([
                        {
                            sender: 'ai',
                            text: `Hello! I'm your Intelligence Assistant. I've analyzed "${formatTitle(currentSession.title)}" and I'm ready to answer any questions based strictly on the content discussed. What would you like to know?`
                        }
                    ]);
                } else {
                    setMessages(initialMessages);
                }

                setGuestMsgCount(msgCount);
            } else if (!loadingSessions) {
                setMessages([
                    {
                        sender: 'ai',
                        text: "Hello! Please select a meeting from the Meeting Vault to start a contextual chat."
                    }
                ]);
            }
        };
        loadMessages();
    }, [currentSession, loadingSessions, userIsGuest]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isProcessing]);

    const saveLocalChat = (newMessages) => {
        if ((userIsGuest || currentSession?.id?.toString().startsWith('fallback_')) && currentSession) {
            localStorage.setItem(`localChat_${currentSession.id}`, JSON.stringify(newMessages));
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        const trimmedInput = input.trim();
        if (!trimmedInput || isProcessing || !currentSession) {
            console.warn("⚠️ [CHAT] Message blocked: empty input, still processing, or no session context.");
            return;
        }

        // Guest Limit Check
        if (userIsGuest && guestMsgCount >= GUEST_MSG_LIMIT) {
            setMessages(prev => [...prev, {
                sender: 'ai',
                text: "🔒 Guest Limit Reached. You have reached the limit of 5 messages per session. Please sign in to continue chatting without limits."
            }]);
            return;
        }

        if (userIsGuest) {
            setGuestMsgCount(prev => prev + 1);
        }

        const userMsg = { sender: 'user', text: trimmedInput };

        // Optimistic Update & Persistence
        setMessages(prev => {
            const updated = [...prev, userMsg];
            saveLocalChat(updated);
            return updated;
        });

        setInput('');
        setIsProcessing(true);

        try {
            console.log("💬 [CHAT] Querying Neural Core...");
            const result = await window.electronAPI.chatQuery({
                query: trimmedInput,
                userId: currentSession.user_id,
                sessionId: currentSession.id,
                transcript: currentSession.transcript || "",
                summary: currentSession.summary || "",
                visuals: useVisualContext ? (currentSession.visuals || "") : ""
            });

            console.log("🔍 [DEBUG] RAW CHAT RESULT:", JSON.stringify(result, null, 2));

            const answerText = result.response || result.answer;
            const aiMsgText = (result.success && answerText) ? answerText : (result.error ? `Error: ${result.error}` : "Neural Core did not return a response.");

            setMessages(prev => {
                const updated = [...prev, { sender: 'ai', text: aiMsgText }];
                saveLocalChat(updated); // Persist AI response for Guest and Offline
                return updated;
            });

        } catch (e) {
            console.error("❌ [CHAT] Critical System Error:", e);
            setMessages(prev => {
                const updated = [...prev, { sender: 'ai', text: "System Error: Unable to reach neural core." }];
                saveLocalChat(updated);
                return updated;
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Local toast removed

    const handleExtractVisuals = async (session) => {
        if (!window.electronAPI || !session.source_path) return;

        showToast("Starting visual extraction...", 'info');

        try {
            const result = await window.electronAPI.extractVisuals(session.source_path);
            if (result.success) {
                // Update local state
                const updatedSessions = sessions.map(s =>
                    s.id === session.id ? { ...s, visuals: result.visuals } : s
                );
                setSessions(updatedSessions);

                if (currentSession?.id === session.id) {
                    setCurrentSession({ ...currentSession, visuals: result.visuals });
                }

                // Persist to Database
                try {
                    await window.electronAPI.updateVisuals({ sessionId: session.id, visuals: result.visuals });
                    console.log("💾 Visuals persisted to DB.");
                } catch (dbErr) {
                    console.error("Failed to persist visuals:", dbErr);
                }

                showToast(`Extracted ${result.visuals.length} visual elements!`, 'success');
            } else {
                console.error("Visual Extraction Failed:", result.error);
                showToast("Extraction Failed: " + (result.error || "Unknown error"), 'error');
            }
        } catch (err) {
            console.error("Extraction Trigger Error:", err);
            showToast("Error triggering extraction.", 'error');
        }
    };

    return (
        <div className="bg-[#050805] text-white font-display overflow-hidden h-screen flex relative">
            <LiveBackground />

            {/* Toast Notification removed here, now handled globally */}

            <Sidebar active="/chat" />

            {/* Meeting Vault Sidebar (Context Switcher) */}
            <div className={`fixed inset-y-0 right-0 w-80 bg-[#050805]/98 backdrop-blur-3xl border-l border-white/5 z-50 transition-transform duration-500 ease-in-out shadow-[-30px_0_60px_rgba(0,0,0,0.8)] ${isVaultOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5 backdrop-blur-md">
                        <div className="flex flex-col">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Meeting Vault</h3>
                            <p className="text-[10px] text-white/40 uppercase font-bold mt-1">Select Active Context</p>
                        </div>
                        <button onClick={() => setIsVaultOpen(false)} className="size-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 hover:rotate-90 transition-all">
                            <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
                        {loadingSessions ? (
                            <div className="flex flex-col items-center justify-center py-24 gap-4">
                                <div className="size-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin shadow-[0_0_15px_rgba(70,236,19,0.2)]"></div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 animate-pulse">Syncing Vault</span>
                            </div>
                        ) : sessions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 opacity-20">
                                <span className="material-symbols-outlined text-4xl mb-2">folder_off</span>
                                <p className="text-center text-xs font-bold uppercase tracking-widest">Vault Empty</p>
                            </div>
                        ) : (
                            sessions.map((s) => (
                                <div
                                    key={s.id}
                                    className={`w-full group/card flex flex-col gap-2 p-5 rounded-[1.5rem] transition-all border text-left relative overflow-hidden ${currentSession?.id === s.id ? 'bg-primary/10 border-primary/40 shadow-[0_0_20px_rgba(70,236,19,0.15)] ring-1 ring-primary/20' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'}`}
                                >
                                    <button
                                        className="absolute inset-0 z-0"
                                        onClick={() => {
                                            setCurrentSession(s);
                                            setIsVaultOpen(false);
                                        }}
                                    />
                                    <div className="relative z-10 pointer-events-none">
                                        <p className={`text-sm font-bold truncate w-full ${currentSession?.id === s.id ? 'text-primary' : 'text-gray-100 group-hover/card:text-white'}`}>{formatTitle(s.title)}</p>
                                        <div className="flex items-center justify-between mt-1 pt-2 border-t border-white/5">
                                            <div className="flex items-center gap-1.5 opacity-40">
                                                <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                                                <span className="text-[10px] font-black uppercase tracking-wider">{new Date(s.date).toLocaleDateString()}</span>
                                            </div>
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${currentSession?.id === s.id ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white/40'}`}>{s.classification || 'General'}</span>
                                        </div>
                                    </div>

                                    {/* Extract Visuals Action - HIDE FOR GUESTS */}
                                    {s.source_path && !userIsGuest && (
                                        <div className="relative z-20 mt-2 flex justify-end">
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (!window.electronAPI) return;

                                                    // Visual feedback for processing (simple alert for V1)
                                                    const btn = e.currentTarget;
                                                    const originalText = btn.innerHTML;
                                                    btn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">refresh</span> Processing...';
                                                    btn.disabled = true;

                                                    try {
                                                        const result = await window.electronAPI.extractVisuals(s.source_path);
                                                        if (result.success) {
                                                            // Update local state immediately for instant feedback
                                                            const updatedSessions = sessions.map(session =>
                                                                session.id === s.id ? { ...session, visuals: result.visuals } : session
                                                            );
                                                            setSessions(updatedSessions);

                                                            if (currentSession?.id === s.id) {
                                                                setCurrentSession({ ...currentSession, visuals: result.visuals });
                                                            }

                                                            // Persist to Database!
                                                            try {
                                                                await window.electronAPI.updateVisuals({ sessionId: s.id, visuals: result.visuals });
                                                                console.log("💾 Visuals persisted to DB.");
                                                            } catch (dbErr) {
                                                                console.error("Failed to persist visuals:", dbErr);
                                                                setToast({ message: "Visuals extracted but failed to save to DB.", type: 'error' });
                                                            }

                                                            setToast({ message: `Extracted ${result.visuals.length} visual elements!`, type: 'success' });
                                                        } else {
                                                            console.error("Visual Extraction Failed:", result.error);
                                                            setToast({ message: "Extraction Failed: " + (result.error || "Unknown error"), type: 'error' });
                                                        }
                                                    } catch (err) {
                                                        console.error("Extraction Trigger Error:", err);
                                                        setToast({ message: "Error triggering extraction.", type: 'error' });
                                                    } finally {
                                                        btn.innerHTML = originalText;
                                                        btn.disabled = false;
                                                    }
                                                }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-primary/20 hover:text-primary text-[10px] font-bold uppercase tracking-wider rounded-lg border border-white/10 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-sm">image</span> Use Visuals
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <main className="flex-1 flex flex-col h-full relative z-10 min-w-0 transition-all duration-500">
                <header className="flex flex-col md:flex-row items-start md:items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5 backdrop-blur-xl z-20 sticky top-0 shrink-0 gap-4">
                    <div className="flex items-center gap-4 min-w-0 w-full md:w-auto">
                        <BackButton />
                        <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-white leading-tight uppercase tracking-wider truncate" title={currentSession?.title}>{formatTitle(currentSession?.title) || 'Neural Workspace'}</h2>
                            </div>
                            {currentSession && (
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 w-fit">
                                        <div className="size-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_5px_rgba(70,236,19,0.5)]"></div>
                                        <span className="text-[9px] font-black text-primary uppercase tracking-widest">Grounded AI</span>
                                    </div>
                                    <span className="text-[10px] text-white/30 font-medium uppercase tracking-wider">{new Date(currentSession.date).toLocaleDateString()}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">

                        {/* Header 'Extract Visuals' Button for Current Session if Missing */}
                        {currentSession?.source_path && (!currentSession.visuals || currentSession.visuals.length === 0) && !userIsGuest && (
                            <button
                                onClick={() => handleExtractVisuals(currentSession)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 transition-all text-[10px] font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(70,236,19,0.1)]"
                            >
                                <span className="material-symbols-outlined text-sm">image_search</span>
                                <span>Extract Visuals</span>
                            </button>
                        )}

                        {/* Visual Context Toggle - Only show if visuals exist */}
                        {currentSession?.visuals && currentSession.visuals.length > 0 && !userIsGuest && (
                            <button
                                onClick={() => setUseVisualContext(!useVisualContext)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${useVisualContext ? 'bg-primary/20 text-primary border-primary/30 shadow-[0_0_10px_rgba(70,236,19,0.2)]' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'}`}
                                title={useVisualContext ? "Visual Context Enabled" : "Visual Context Disabled"}
                            >
                                <span className="material-symbols-outlined text-sm">{useVisualContext ? 'visibility' : 'visibility_off'}</span>
                                <span className="hidden sm:inline">{useVisualContext ? 'Visuals ON' : 'Visuals OFF'} ({currentSession.visuals.length})</span>
                            </button>
                        )}

                        {!userIsGuest && (
                            <button
                                onClick={() => setIsVaultOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-xs font-bold uppercase tracking-wider text-white group whitespace-nowrap"
                            >
                                <span className="material-symbols-outlined text-sm text-primary group-hover:rotate-180 transition-transform duration-500">history</span>
                                <span>Vault</span>
                            </button>
                        )}
                        {userIsGuest && (
                            <div className=" px-4 py-2 rounded-full bg-white/5 border border-white/5 text-xs font-bold uppercase tracking-wider text-white/50">
                                Guest Mode ({GUEST_MSG_LIMIT - guestMsgCount} msgs left)
                            </div>
                        )}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-10 flex flex-col gap-10 custom-scrollbar relative" id="chat-container">
                    {!currentSession && !loadingSessions && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 py-24 select-none">
                            <div className="size-24 rounded-[2rem] bg-white/5 flex items-center justify-center mb-8 rotate-12 border border-white/10">
                                <span className="material-symbols-outlined text-[48px] text-primary">inventory_2</span>
                            </div>
                            <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-[0.2em]">Context Missing</h3>
                            <p className="text-sm text-gray-400 max-w-sm leading-relaxed mb-8">{userIsGuest ? "As a Guest, please start a new session to begin chatting." : "Please select a history from the vault or start a new session."}</p>

                            <Link to="/new-session" className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-black font-bold uppercase tracking-wider hover:scale-105 transition-transform shadow-lg shadow-primary/20">
                                <span className="material-symbols-outlined">add_circle</span>
                                <span>Start New Session</span>
                            </Link>
                        </div>
                    )}

                    {currentSession && messages.map((msg, idx) => (
                        <div key={idx} className={`flex items-end gap-5 max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700 ${msg.sender === 'user' ? 'ml-auto justify-end' : ''}`}>
                            {msg.sender === 'ai' && (
                                <div className="size-11 rounded-2xl bg-primary/20 text-primary border border-primary/30 flex items-center justify-center shrink-0 shadow-xl shadow-primary/5 ring-1 ring-primary/20">
                                    <span className="material-symbols-outlined text-[22px] fill-1">psychology</span>
                                </div>
                            )}

                            <div className={`flex flex-col gap-2 ${msg.sender === 'user' ? 'items-end' : 'w-full'}`}>
                                <div className={`px-7 py-5 rounded-[2.2rem] shadow-2xl border transition-all ${msg.sender === 'ai'
                                    ? 'rounded-bl-none bg-white/5 border-white/10 text-gray-200 leading-[1.6]'
                                    : 'rounded-br-none bg-primary border-primary/20 text-black font-semibold shadow-primary/10'
                                    }`}>
                                    <p className="whitespace-pre-wrap text-sm md:text-[15px]">{msg.text}</p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {isProcessing && (
                        <div className="flex items-end gap-5 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="size-11 rounded-2xl bg-primary/20 text-primary border border-primary/30 flex items-center justify-center shrink-0 shadow-xl shadow-primary/5 ring-1 ring-primary/20">
                                <span className="material-symbols-outlined text-[22px] animate-spin">cyclone</span>
                            </div>
                            <div className="px-7 py-5 rounded-[2.2rem] rounded-bl-none bg-white/5 border border-white/10 text-primary/40 shadow-sm w-fit backdrop-blur-md">
                                <div className="flex gap-2 p-1">
                                    <div className="size-2 rounded-full bg-primary/60 animate-bounce shadow-[0_0_5px_rgba(70,236,19,0.4)]"></div>
                                    <div className="size-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.3s] shadow-[0_0_5px_rgba(70,236,19,0.4)]"></div>
                                    <div className="size-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.5s] shadow-[0_0_5px_rgba(70,236,19,0.4)]"></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} className="h-4" />
                    <div className="h-40 shrink-0"></div>
                </div>

                <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[#020402] via-[#020402]/95 to-transparent pt-32 pb-10 px-4 md:px-12 z-20">
                    <div className="max-w-4xl mx-auto flex flex-col gap-4">
                        <div className={`relative flex items-end gap-3 bg-white/10 backdrop-blur-3xl rounded-[2rem] p-2 pl-2 shadow-2xl transition-all border border-white/10 focus-within:border-primary/40 group ${!currentSession ? 'opacity-20 pointer-events-none' : ''}`}>
                            <textarea
                                className="w-full bg-transparent border-none text-white placeholder-white/20 focus:ring-0 resize-none py-2.5 max-h-32 text-sm outline-none px-4 scrollbar-hide font-medium"
                                placeholder={currentSession ? "Ask anything..." : "Choose a session to begin analysis."}
                                rows="1"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage(e);
                                    }
                                }}
                            ></textarea>
                            <button
                                onClick={handleSendMessage}
                                className="size-10 rounded-full bg-primary text-black hover:scale-110 active:scale-95 transition-all shadow-xl shadow-primary/20 shrink-0 flex items-center justify-center group/send disabled:opacity-40 disabled:cursor-not-allowed disabled:grayscale"
                                disabled={isProcessing || !input.trim() || !currentSession}
                            >
                                <span className="material-symbols-outlined filled text-[20px] group-hover/send:translate-y-[-2px] transition-transform">arrow_upward</span>
                            </button>
                        </div>
                        <p className="text-center text-[10px] font-black text-white/10 uppercase tracking-[0.5em] select-none">Context Grounded AI • Groq Llama 3.3 Infrastructure</p>
                    </div>
                </div>
            </main>
        </div >
    );
}
