import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { query } from '../../db/database.js';

dotenv.config();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'YOUR_API_KEY');

export async function chatQuery(userQuery, userId, sessionId, providedTranscript = null) {
    // 1. Fetch Session Context (Transcript & Visuals)
    let context = '';

    if (providedTranscript) {
        context = `Here is the meeting transcript context:\n${providedTranscript}\n\n`;
    } else if (sessionId) {
        try {
            const sessions = await query('SELECT `transcript`, `visuals` FROM `sessions` WHERE `id` = ?', [sessionId]);
            if (sessions.length > 0) {
                const session = sessions[0];
                context = `Here is the meeting transcript context:\n${session.transcript}\n\n`;
                if (session.visuals) {
                    let visuals = [];
                    try {
                        visuals = typeof session.visuals === 'string' ? JSON.parse(session.visuals) : session.visuals;
                    } catch (e) {
                        console.warn('⚠️ Failed to parse visuals:', e);
                    }
                    const visualText = Array.isArray(visuals) ? visuals.map(v => v.text).filter(t => t).join('\n') : '';
                    if (visualText) {
                        context += `Here is text extracted from visuals/slides in the meeting:\n${visualText}\n\n`;
                    }
                }
            }
        } catch (dbError) {
            console.error('❌ Failed to fetch session context:', dbError);
        }
    }

    // 2. Fetch Recent Chat History for Context
    let chatHistoryContext = '';
    if (userId && sessionId) {
        try {
            const history = await query(
                'SELECT `urole`, `umessage` FROM `chat_history` WHERE `user_id` = ? AND `session_id` = ? ORDER BY `created_at` DESC LIMIT 10',
                [userId, sessionId]
            );
            // Reverse to get chronological order
            chatHistoryContext = history.reverse().map(h => `${h.urole === 'user' ? 'User' : 'Assistant'}: ${h.umessage}`).join('\n');
            if (chatHistoryContext) {
                chatHistoryContext = `\nRecent Chat History:\n${chatHistoryContext}\n`;
            }
        } catch (dbError) {
            console.error('❌ Failed to fetch chat history:', dbError);
        }
    }

    // 3. Save User Message
    if (userId && sessionId) {
        try {
            await query(
                'INSERT INTO `chat_history` (`user_id`, `session_id`, `urole`, `umessage`) VALUES (?, ?, ?, ?)',
                [userId, sessionId, 'user', userQuery]
            );
        } catch (dbError) {
            console.error('❌ Failed to save user message:', dbError);
        }
    }

    if (!process.env.GEMINI_API_KEY) {
        const mockResponse = "I'm running in offline mode (API Key missing). I can't process your query intelligently yet, but I received it!";
        return { success: true, response: mockResponse };
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const systemInstruction =
            "You are an expert AI Meeting Assistant. Your primary goal is to answer questions using ONLY the provided meeting context (transcript and visual OCR data). " +
            "If the answer is not present in the content, state that you don't have enough information from the meeting to answer. " +
            "You also have access to the last few messages of the conversation for continuity. " +
            "Be concise, use bullet points if helpful, and maintain a professional tone.";

        const fullPrompt = `${context}${chatHistoryContext}\n\nCurrent User Question: ${userQuery}`;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
            systemInstruction: systemInstruction,
            generationConfig: {
                maxOutputTokens: 1024,
                temperature: 0.5, // Lower temperature for more factual responses
            }
        });
        const response = result.response.text();

        // 4. Save AI Response
        if (userId && sessionId) {
            try {
                await query(
                    'INSERT INTO `chat_history` (`user_id`, `session_id`, `urole`, `umessage`) VALUES (?, ?, ?, ?)',
                    [userId, sessionId, 'assistant', response]
                );
            } catch (dbError) {
                console.error('❌ Failed to save AI response:', dbError);
            }
        }

        return { success: true, response };
    } catch (error) {
        console.error('Chatbot error:', error);
        return { success: false, error: 'Chat Analysis Failed: ' + error.message };
    }
}
