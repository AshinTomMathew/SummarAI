import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import BackButton from '../components/BackButton';

export default function ChatPage() {


    const location = useLocation();
    const sessionData = location.state || {
        title: "General Chat",
        transcript: "No specific meeting context.",
        classification: "General",
        date: new Date()
    };

    // Initial greeting
    const [messages, setMessages] = useState([
        {
            sender: 'ai',
            text: `Hello! I'm ready to discuss the "${sessionData.title}". What would you like to know?`
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async () => {
        if (!input.trim()) return;

        const userMsg = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const contextPrompt = `Context: This is a chat about a meeting titled "${sessionData.title}". Transcript excerpt: ${sessionData.transcript ? sessionData.transcript.substring(0, 1000) : ''}... User asks: ${input}`;

            const result = await window.electronAPI.chatQuery({
                query: contextPrompt,
                userId: sessionData.user_id,
                sessionId: sessionData.id
            });

            if (result.success) {
                setMessages(prev => [...prev, { sender: 'ai', text: result.response }]);
            } else {
                setMessages(prev => [...prev, { sender: 'ai', text: "Sorry, I encountered an error." }]);
            }
        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { sender: 'ai', text: "Start the backend to chat!" }]);
        }
        setIsTyping(false);
    };

    return (
        <div className="bg-background-light dark:bg-background-dark text-[#152211] dark:text-white font-display overflow-hidden h-screen flex">
            <Sidebar active="/chat" />
            <main className="flex-1 flex flex-col h-full relative">
                <header className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-background-dark/95 backdrop-blur z-10 sticky top-0">
                    <div className="flex items-center gap-4">
                        <BackButton className="md:hidden" />
                        <button className="md:hidden text-white"><span className="material-symbols-outlined">menu</span></button>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-white leading-tight">{sessionData.title}</h2>
                                <span className="px-2 py-0.5 rounded-full bg-surface-border text-[10px] font-bold text-primary uppercase tracking-wide">AI Active</span>
                            </div>
                        </div>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6" id="chat-container">
                    <div className="flex justify-center my-4">
                        <span className="text-xs font-medium text-text-secondary px-3 py-1 bg-surface-border/50 rounded-full">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex items-end gap-3 max-w-3xl ${msg.sender === 'user' ? 'ml-auto justify-end' : ''}`}>
                            {msg.sender === 'ai' && (
                                <div className="size-8 rounded-full bg-gradient-to-br from-primary to-green-800 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-background-dark text-sm font-bold">smart_toy</span>
                                </div>
                            )}

                            <div className={`flex flex-col gap-1 ${msg.sender === 'user' ? 'items-end' : 'w-full'}`}>
                                <span className="text-xs text-text-secondary mx-1">{msg.sender === 'ai' ? 'AI Assistant' : 'You'}</span>
                                <div className={`p-4 rounded-2xl shadow-sm ${msg.sender === 'ai' ? 'rounded-bl-none bg-surface-border text-white w-fit' : 'rounded-br-none bg-primary text-background-dark'}`}>
                                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex items-end gap-3 max-w-3xl">
                            <div className="size-8 rounded-full bg-gradient-to-br from-primary to-green-800 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-background-dark text-sm font-bold">smart_toy</span>
                            </div>
                            <div className="p-4 rounded-2xl rounded-bl-none bg-surface-border text-white shadow-sm w-fit">
                                <p className="leading-relaxed animate-pulse">...</p>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                    <div className="h-24"></div>
                </div>
                <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-background-dark via-background-dark to-transparent pt-10 pb-6 px-4 md:px-8">
                    <div className="max-w-4xl mx-auto flex flex-col gap-3">
                        <div className="relative flex items-end gap-2 bg-surface-border/60 backdrop-blur-md border border-white/10 rounded-[28px] p-2 pr-2 shadow-lg">
                            <textarea
                                className="w-full bg-transparent border-none text-white placeholder-text-secondary/60 focus:ring-0 resize-none py-3 max-h-32 text-base outline-none px-4"
                                placeholder={`Ask about ${sessionData.title}...`}
                                rows="1"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                            ></textarea>
                            <button onClick={handleSendMessage} className="p-3 rounded-full bg-primary text-background-dark hover:brightness-110 transition-all shadow-lg shadow-primary/20 shrink-0">
                                <span className="material-symbols-outlined filled">arrow_upward</span>
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
