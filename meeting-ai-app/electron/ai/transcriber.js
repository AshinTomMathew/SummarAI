import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'YOUR_API_KEY');

// Helper to convert file to GoogleGenerativeAI.Part
function fileToGenerativePart(path, mimeType) {
    return {
        inlineData: {
            data: fs.readFileSync(path).toString("base64"),
            mimeType
        },
    };
}

export async function transcribeAudio(audioPath) {
    console.log('🎙️ Transcribing audio from:', audioPath);

    if (!process.env.GEMINI_API_KEY) {
        return { success: false, error: 'GEMINI_API_KEY is missing.' };
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Assuming mp3 from our recorder.js
        const audioPart = fileToGenerativePart(audioPath, "audio/mp3");
        const prompt = "Please transcribe this audio file accurately. Provide only the transcript text, no markdown or additional commentary.";

        const result = await model.generateContent([prompt, audioPart]);
        const response = await result.response;
        const text = response.text();

        console.log('✅ Transcription complete');
        return { success: true, text: text };
    } catch (error) {
        console.error('❌ Transcription error:', error);
        return { success: false, error: error.message };
    }
}
