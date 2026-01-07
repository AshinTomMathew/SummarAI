import fetch from 'node-fetch';

export async function generateSummary(transcript) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return { success: false, error: 'GEMINI_API_KEY is missing. Please add it to your .env file.' };
    }

    const prompt = `Adaptively summarize the following meeting transcript based on its content type. 
    - Identify key decisions, action items, and main topics. 
    - Format the output with clear headings (e.g., ## Key Takeaways, ## Action Items).
    - Be concise but comprehensive.
    
    Transcript:
    ${transcript}`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || "No summary generated.";
        return { success: true, summary };
    } catch (error) {
        console.error("Summary Generation Error:", error);
        return { success: false, error: error.message };
    }
}

export async function classifyContent(transcript) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { success: false, error: 'API Key not configured' };

    const prompt = `Classify this meeting transcript into one of these categories: Marketing, Engineering, Sales, HR, Management. Output only the category name.\n\nTranscript: ${transcript}`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        const category = data.candidates[0].content.parts[0].text.trim();
        return { success: true, category };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
