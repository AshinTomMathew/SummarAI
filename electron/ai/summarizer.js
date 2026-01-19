import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'YOUR_API_KEY');

export async function generateSummary(transcript, category = 'General') {
    if (!process.env.GEMINI_API_KEY) {
        return { success: false, error: 'GEMINI_API_KEY is missing.' };
    }

    const templates = {
        'Educational': 'Provide: 1. Core Subject/Topic, 2. Key Learning Points, 3. Important Definitions, 4. Critical Formulas/Concepts, 5. Actionable Examples, 6. Suggested Revision Questions.',
        'Business': 'Provide: 1. Executive Summary, 2. Key Stakeholder Opinions, 3. Strategic Decisions Made, 4. Project Timelines & Milestones, 5. Risk Factors & Blockers, 6. Financial/Resource Implications.',
        'Team Meeting': 'Provide: 1. Goal of Meeting, 2. Individual Updates & Progress, 3. Critical Blockers discussed, 4. Clear Action Items (with owners & deadlines), 5. Next Sync Date.',
        'Podcast': 'Provide: 1. Episode Theme, 2. Guest Bio/Context, 3. Notable Quotes & timestamps (if applicable), 4. Key Takeaways for Audience, 5. Resources mentioned.',
        'Interview': 'Provide: 1. Candidate Background Summary, 2. Key Skills Demonstrated, 3. Answers to Behavioral Questions, 4. Cultural Fit Assessment, 5. Recommended Next Steps.',
        'General': 'Provide: 1. High-level Overview, 2. Major Discussion Points, 3. Notable Insights, 4. Conclusions & Next Steps.'
    };

    const specificSections = templates[category] || templates['General'];

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const systemInstruction = `You are a world-class ${category} analyst. Your task is to transform the meeting transcript into a highly structured, professional summary. 
        Format your response using ONLY Markdown. Highlight key terms in **bold**.`;

        const prompt = `Structure your response using these exact sections:
        ${specificSections}

        Transcript to Analyze:
        ${transcript.substring(0, 80000)}
        `;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            systemInstruction: systemInstruction
        });

        const summary = result.response.text();
        return { success: true, summary };
    } catch (error) {
        console.error("Summary Generation Error:", error);
        return { success: false, error: error.message };
    }
}

export async function classifyContent(transcript) {
    if (!process.env.GEMINI_API_KEY) return { success: false, error: 'API Key not configured' };

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `Classify this meeting transcript into EXACTLY ONE of these categories: Educational, Business, Team Meeting, Podcast, Interview, General. 
        Output ONLY the category name without formatting.\n\nTranscript: ${transcript.substring(0, 5000)}`;

        const result = await model.generateContent(prompt);
        const category = result.response.text().trim().replace(/[*_]/g, '');
        return { success: true, category };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
