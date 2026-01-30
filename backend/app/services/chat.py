import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# Initialize Groq Client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def answer_question(question: str, transcript: str, summary: str = "", visuals: str = "") -> str:
    """
    Highly intelligent conversational AI that answers questions based on meeting transcripts
    and visual OCR data. Prioritizes Gemini for high limits, falls back to Groq.
    """
    print(f"💬 Chat Query: {question}")
    
    if not transcript or len(transcript.strip()) < 10:
        return "I don't have enough context from the meeting to answer that yet. Please ensure the transcription is complete."

    # Construct the context sections
    context_parts = []
    if summary:
        context_parts.append(f"### CONTEXT - EXISTING SUMMARY:\n'''{summary}'''")
    if visuals:
        context_parts.append(f"### CONTEXT - VISUALS & SLIDES (OCR):\n'''{visuals}'''")
    
    # 3. Transcript Context (Truncated to fit remaining window if necessary, but 25k is usually safe)
    context_parts.append(f"### CONTEXT - FULL TRANSCRIPT:\n'''{transcript[:25000]}'''")
    
    full_context = "\n\n".join(context_parts)

    # Expert System Prompt
    system_prompt = (
        "You are the Neural Intelligence Core for MeetingAI, an expert meeting analyst and executive assistant. "
        "Your goal is to answer questions about the meeting accurately, professionally, and intelligently.\n\n"
        
        "### CORE INSTRUCTIONS:\n"
        "1. **Context Grounding**: Answer strictly based on the provided TRANSCRIPT, SUMMARY, and VISUALS. Do not make up information.\n"
        "2. **Smart Retrieval**: \n"
        "   - If the user asks for the summary, provide a **detailed, comprehensive executive summary**. Start with a **comprehensive narrative paragraph** providing the full context, then break down specific details. **Do NOT be brief** unless explicitly asked.\n"
        "   - If the user asks about slides, charts, or visual content, refer to the VISUALS (OCR) section and integrate it into your answer.\n"
        "   - If they ask for specific details (dates, decisions, numbers), provide full context from the TRANSCRIPT.\n"
        "3. **Tone**: Be professional, insightful, and thorough. Avoid robotic phrases like 'According to the transcript'. Answer naturally and fully.\n"
        "4. **Formatting**: Use Markdown heavily. **Use long paragraphs** for the overview section to provide depth. Use bullet points only for lists of items.\n"
        "5. **Handling Visuals**: If using information from a slide/visual, explicitly mention details found in the image text (e.g., 'Slide 3 shows a growth chart...').\n"
        "6. **Detail Level**: Go deep. Explain the 'why' and 'how', not just the 'what'. Ensure the response is substantial.\n\n"
        
        f"{full_context}"
    )

    # Try Groq (Primary then Secondary)
    groq_keys = [os.getenv("GROQ_API_KEY"), os.getenv("GROQ_API_KEY_2")]
    
    for i, api_key in enumerate(groq_keys):
        if not api_key: continue
        
        try:
            engine_label = "Primary" if i == 0 else "Secondary"
            print(f"🚀 Using Groq Neural Engine ({engine_label})...")
            from groq import Groq
            client = Groq(api_key=api_key)
            
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": question}
                ],
                temperature=0.3,
                max_tokens=2048
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            engine_label = "Primary" if i == 0 else "Secondary"
            print(f"⚠️ Groq {engine_label} Chat Failure: {e}")
            if i == 0 and groq_keys[1]:
                print("🔄 Switching to Secondary Groq Key for Chat...")
                continue
            return "The Intelligence Core is currently overloaded (Rate Limited). Please try again in a few minutes."
