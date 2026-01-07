import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { query } from '../database.js';

dotenv.config();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'YOUR_API_KEY');

export async function chatQuery(userQuery, userId, sessionId) {
    console.log('🤖 Chatbot Query:', userQuery);

    // 1. Save User Message
    if (userId && sessionId) {
        try {
            await query(
                'INSERT INTO chat_history (user_id, session_id, urole, umessage) VALUES (?, ?, ?, ?)',
                [userId, sessionId, 'user', userQuery]
            );
        } catch (dbError) {
            console.error('❌ Failed to save user message:', dbError);
        }
    }

    if (!process.env.GEMINI_API_KEY) {
        const mockResponse = "I'm running in offline mode (API Key missing). I can't process your query intelligently yet, but I received it!";
        // Save Mock Response
        if (userId && sessionId) {
            try {
                await query(
                    'INSERT INTO chat_history (user_id, session_id, urole, umessage) VALUES (?, ?, ?, ?)',
                    [userId, sessionId, 'assistant', mockResponse]
                );
            } catch (ignore) { }
        }
        return {
            success: true,
            response: mockResponse
        };
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Construct prompt (context is already embedded in userQuery called from frontend)
        const result = await model.generateContent(userQuery);
        const response = result.response.text();

        // 2. Save AI Response
        if (userId && sessionId) {
            try {
                await query(
                    'INSERT INTO chat_history (user_id, session_id, urole, umessage) VALUES (?, ?, ?, ?)',
                    [userId, sessionId, 'assistant', response]
                );
            } catch (dbError) {
                console.error('❌ Failed to save AI response:', dbError);
            }
        }

        return { success: true, response };
    } catch (error) {
        console.error('Chatbot error:', error);
        return { success: false, error: error.message };
    }
}
