import { useState, useEffect, useMemo } from 'react';

/**
 * A beautiful, child-friendly, and professional Mind Map with perfected typography.
 * Uses Manrope for display and Noto Sans for content to ensure maximum readability.
 */
export default function MindMap({ content }) {
    const data = useMemo(() => {
        if (!content) return null;
        return parseContent(content);
    }, [content]);

    if (!data) return (
        <div className="w-full h-full flex items-center justify-center bg-[#0d160b] text-primary/40 text-xs font-black uppercase tracking-[0.5em] font-display">
            Optimizing Typography...
        </div>
    );

    return (
        <div className="w-full h-full overflow-auto bg-[#0d160b] selection:bg-primary/20 custom-scrollbar font-body antialiased">
            <div className="max-w-7xl mx-auto p-6 md:p-12 space-y-24 pb-48">

                {/* --- THE MIND MAP CORE --- */}
                <section className="flex flex-col items-center">
                    <header className="mb-16 text-center">
                        <h2 className="text-white/30 text-[10px] font-black uppercase tracking-[0.6em] mb-4 font-display">Knowledge Hub</h2>
                        <div className="h-px w-24 bg-gradient-to-r from-transparent via-primary/50 to-transparent mx-auto"></div>
                    </header>

                    <div className="w-full min-h-[500px] relative">
                        {data.nodes.length > 0 ? (
                            <div className="flex flex-col items-center">
                                <VerticalMindMap nodes={data.nodes} />
                            </div>
                        ) : (
                            <div className="text-white/10 text-center italic py-20 uppercase tracking-widest font-black font-display">Processing structure...</div>
                        )}
                    </div>
                </section>

                {/* --- STUDY AIDS (THE PREV PREMIUM DESIGN) --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* FLASHCARDS */}
                    {data.flashcards.length > 0 && (
                        <div className="space-y-8">
                            <header className="flex items-center gap-4">
                                <div className="h-10 w-1.5 bg-primary rounded-full shadow-[0_0_15px_rgba(70,236,19,0.5)]"></div>
                                <h3 className="text-2xl font-extrabold text-white uppercase tracking-tight font-display">
                                    Study <span className="text-primary italic">Flashcards</span>
                                </h3>
                            </header>

                            <div className="space-y-4">
                                {data.flashcards.map((card, idx) => (
                                    <div
                                        key={idx}
                                        className="glass-card bg-[#1c2e17]/30 backdrop-blur-xl rounded-[1.5rem] p-6 border border-white/10 hover:border-primary/40 transition-all duration-500 group shadow-2xl hover:-translate-y-1"
                                    >
                                        <div className="flex items-start gap-6">
                                            <div className="flex-shrink-0 size-8 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 group-hover:bg-primary group-hover:text-black transition-all font-black text-primary text-xs font-display">
                                                {idx + 1}
                                            </div>
                                            <div className="text-white/90 text-[15px] leading-relaxed group-hover:text-white transition-colors tracking-wide">
                                                {renderRichText(card)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* KEY TAKEAWAYS */}
                    {data.keynotes.length > 0 && (
                        <div className="space-y-8">
                            <header className="flex items-center gap-4">
                                <div className="h-10 w-1.5 bg-primary rounded-full shadow-[0_0_15px_rgba(70,236,19,0.5)]"></div>
                                <h3 className="text-2xl font-extrabold text-white uppercase tracking-tight font-display">
                                    Key <span className="text-primary italic">Takeaways</span>
                                </h3>
                            </header>

                            <div className="glass-card bg-[#1c2e17]/20 rounded-[2.5rem] p-10 border border-white/5 shadow-inner">
                                <ul className="space-y-8">
                                    {data.keynotes.map((note, idx) => (
                                        <li key={idx} className="flex items-start gap-6 group">
                                            <div className="flex-shrink-0 mt-3 size-2 rounded-full bg-primary/40 shadow-[0_0_8px_rgba(70,236,19,0.3)] group-hover:bg-primary group-hover:shadow-[0_0_12px_rgba(70,236,19,0.8)] group-hover:scale-125 transition-all"></div>
                                            <div className="text-white/80 text-[15px] leading-relaxed group-hover:text-white transition-colors border-b border-white/5 pb-6 w-full last:border-0 last:pb-0 tracking-wide">
                                                {renderRichText(note)}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * A Vertical, Symmetrical Tree Mind Map with refined fonts
 */
function VerticalMindMap({ nodes }) {
    const tree = buildHierarchy(nodes);

    return (
        <div className="flex flex-col items-center w-full font-display">
            {/* THE CORE (LEVEL 0) */}
            <div className="relative z-30 mb-20 group">
                <div className="absolute inset-0 bg-primary/30 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative bg-primary text-[#0d160b] px-12 py-6 rounded-[2rem] font-black text-xl md:text-2xl uppercase tracking-tighter shadow-2xl border-4 border-[#0d160b]/20 text-center max-w-md antialiased">
                    {tree.text || "Perspective Hub"}
                </div>
            </div>

            {/* THE FIRST WAVE (LEVEL 1) */}
            {tree.children && tree.children.length > 0 && (
                <div className="relative flex flex-wrap justify-center gap-12 md:gap-20 w-full px-4">
                    {/* Visual Connector Line from Top */}
                    <div className="absolute top-[-80px] left-1/2 w-[2px] h-20 bg-gradient-to-b from-primary/60 to-primary/10 -translate-x-1/2 hidden md:block"></div>

                    {tree.children.map((child, i) => (
                        <div key={i} className="flex flex-col items-center min-w-[280px] max-w-[340px] relative">
                            {/* Branch Connector */}
                            <div className="h-10 w-[2px] bg-primary/20"></div>

                            {/* Branch Container */}
                            <div className="w-full bg-[#1c2e17]/60 border-2 border-primary/20 p-8 rounded-[2.5rem] shadow-xl hover:border-primary/60 transition-all duration-300 group hover:bg-[#1c2e17]/80">
                                <div className="text-white font-extrabold text-base uppercase mb-5 text-center leading-tight tracking-tight">
                                    {renderRichText(child.text)}
                                </div>

                                {/* LEVEL 2+ (Details) */}
                                {child.children.length > 0 && (
                                    <div className="flex flex-col gap-4 mt-5 pt-5 border-t border-white/10 font-body">
                                        {child.children.map((sub, j) => (
                                            <div key={j} className="flex items-start gap-3 group/item">
                                                <span className="text-primary font-black text-[10px] mt-1.5 opacity-40 group-hover/item:opacity-100 transition-opacity">▸</span>
                                                <div className="text-white/70 text-[13px] italic font-medium leading-relaxed group-hover/item:text-white transition-colors tracking-wide">
                                                    {renderRichText(sub.text)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Rich Text Conversion with optimized styling
 */
function renderRichText(text) {
    if (typeof text !== 'string') return text;
    let html = text
        // Bold -> Enhanced Primary Highlighting (Display Font)
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary font-extrabold tracking-tight font-display">$1</strong>')
        .replace(/__(.*?)__/g, '<strong class="text-primary font-extrabold tracking-tight font-display">$1</strong>')
        // Italics -> Sophisticated Emphasized (Body Font)
        .replace(/\*(.*?)\*/g, '<em class="text-white/90 font-medium italic font-body">$1</em>')
        .replace(/_(.*?)_/g, '<em class="text-white/90 font-medium italic font-body">$1</em>')
        // Highlight -> Premium Capsule Style (Display Font for emphasis)
        .replace(/==(.*?)==/g, '<mark class="bg-primary/20 text-primary border border-primary/20 px-2 py-0.5 rounded-full text-[0.85em] font-black mx-1 font-display uppercase">$1</mark>');
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

/**
 * Hierarchy Builder
 */
function buildHierarchy(nodes) {
    if (!nodes.length) return { text: '', children: [] };

    // Clean root text from meta-headers like "Educational Study Guide:"
    let rootText = nodes[0].text;
    if (rootText.includes(':')) {
        const parts = rootText.split(':');
        rootText = parts[parts.length - 1].trim();
    }

    // Final cleanup of markers
    rootText = rootText.replace(/\*\*|__/g, '').replace(/==/g, '');

    const root = { text: rootText, children: [] };
    const stack = [{ node: root, level: nodes[0].level }];

    for (let i = 1; i < nodes.length; i++) {
        const item = nodes[i];
        const node = { text: item.text, children: [] };

        while (stack.length > 1 && stack[stack.length - 1].level >= item.level) {
            stack.pop();
        }

        stack[stack.length - 1].node.children.push(node);
        stack.push({ node, level: item.level });
    }
    return root;
}

/**
 * Content Parser
 */
function parseContent(text) {
    const res = { nodes: [], flashcards: [], keynotes: [] };
    const lines = text.split('\n');
    let section = 'mindmap';

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        const lower = trimmed.toLowerCase();
        if (lower.includes('mindmap') || lower.includes('concept map')) { section = 'mindmap'; return; }
        if (lower.includes('flashcard')) { section = 'flashcards'; return; }
        if (lower.includes('keynote') || lower.includes('takeaway')) { section = 'keynotes'; return; }

        const clean = trimmed.replace(/^[•\-\*\d.]+\s*/, '').trim();
        if (section === 'mindmap') {
            res.nodes.push({ text: clean, level: line.search(/\S/) });
        } else if (section === 'flashcards') {
            res.flashcards.push(clean);
        } else if (section === 'keynotes') {
            res.keynotes.push(clean);
        }
    });

    // Fallback: Use everything if section markers are missing
    if (res.nodes.length < 2) {
        lines.slice(0, 15).forEach(l => {
            const t = l.trim();
            if (t.length > 3) res.nodes.push({ text: t, level: l.search(/\S/) });
        });
    }

    return res;
}
