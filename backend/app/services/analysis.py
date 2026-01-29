import os
import json
import torch
import collections
import traceback
from groq import Groq
from dotenv import load_dotenv
from transformers import pipeline

load_dotenv()

# Global model state for fallbacks
_summarizer = None
_classifier = None

# Optimization: Set torch threads globally for better CPU performance
torch.set_num_threads(4)

# Summary Templates based on User Requirements (STRICT)
SUMMARY_TEMPLATES = {
    'educational': [
        "Extract key concepts",
        "Explain important definitions",
        "Include examples if present"
    ],
    'business': [
        "Highlight objectives",
        "Mention strategies, plans, or metrics",
        "Summarize conclusions"
    ],
    'team meeting': [
        "List agenda points",
        "List decisions made",
        "List action items (with names if mentioned)"
    ],
    'interview': [
        "Highlight questions and key answers",
        "Capture opinions and insights"
    ],
    'podcast': [
        "Summarize main themes",
        "Highlight discussions and viewpoints"
    ],
    'general': [
        "Provide a concise high-level summary"
    ]
}

def get_summarizer():
    global _summarizer
    if _summarizer is None:
        _summarizer = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6", device=-1)
    return _summarizer

def get_classifier():
    global _classifier
    if _classifier is None:
        _classifier = pipeline("zero-shot-classification", model="valhalla/distilbart-mnli-12-3", device=-1)
    return _classifier

def analyze_transcript(text: str) -> dict:
    """
    Unified analysis engine that performs classification and summarization in one pass (if possible).
    Returns a dict with 'category' and 'summary'.
    """
    if not text or len(text.strip()) < 50:
        return {
            "category": "general",
            "summary": "Insufficient content for a detailed analysis."
        }

    api_key = os.environ.get("GROQ_API_KEY")
    if api_key:
        try:
            print("🚀 Using Unified Analysis Engine (Groq)...")
            client = Groq(api_key=api_key)
            chunk = text[:12000] # Use a large chunk for context
            
            # THE EXACT PROMPT REQUESTED BY THE USER
            system_prompt = """You are an AI content analysis engine.

Your task has TWO STEPS and you must perform them in order.

--------------------------------------------------
STEP 1: CONTENT CLASSIFICATION
--------------------------------------------------

Classify the following transcript into EXACTLY ONE of the categories below.

Categories:
- Educational
- Business
- Team Meeting
- Interview
- Podcast
- General

Rules:
- Choose only ONE category
- Do NOT explain the choice
- Do NOT add extra text

--------------------------------------------------
STEP 2: CONTENT-AWARE SUMMARY GENERATION
--------------------------------------------------

Based on the classified category, generate a summary using the rules below.

Summary templates:

Educational:
- Extract key concepts
- Explain important definitions
- Include examples if present

Business:
- Highlight objectives
- Mention strategies, plans, or metrics
- Summarize conclusions

Team Meeting:
- List agenda points
- List decisions made
- List action items (with names if mentioned)

Interview:
- Highlight questions and key answers
- Capture opinions and insights

Podcast:
- Summarize main themes
- Highlight discussions and viewpoints

General:
- Provide an exhaustive deep-dive summary covering every minor and major point with technical detail

Rules:
- Be extremely thorough, exhaustive, and highly detailed
- Provide a deep-dive analysis across multiple paragraphs
- Use CLEAR CAPS HEADERS (e.g., SECTION TITLE) to organize different themes instead of symbols.
- DO NOT use markdown symbols like '#' or '*' in the output.
- Do not hallucinate information
- Give an intensive, granular explanation of every topic discussed
- Do not mention the template
- Ensure the summary is comprehensive, highly professional, and covers all relevant context in depth.

--------------------------------------------------
OUTPUT FORMAT (STRICT)
--------------------------------------------------
Return ONLY valid JSON in the following structure:

{
  "category": "<one_of_the_categories>",
  "summary": "<generated_summary_text>"
}
"""
            
            chat_completion = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"TRANSCRIPT:\n\"\"\"\n{chunk}\n\"\"\""}
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.5, # Slightly higher for more descriptive output
                response_format={"type": "json_object"} # Ensure JSON output
            )
            
            response_text = chat_completion.choices[0].message.content
            result = json.loads(response_text)
            
            # Ensure the structure matches expectations
            if "category" in result and "summary" in result:
                return result
            
        except Exception as e:
            print(f"⚠️ Unified Analysis Failed: {e}. Falling back to legacy separate steps...")

    # Fallback to separate local/sequential steps if Groq fails or is not available
    cat = classify(text)
    summ = summarize(text, cat)
    return {"category": cat, "summary": summ}

def classify(text: str) -> str:
    """
    Ultra-fast classification using local model.
    """
    if not text or len(text.strip()) < 50:
        return "general"

    try:
        clf = get_classifier()
        candidate_labels = ["educational", "business", "team meeting", "podcast", "interview", "general"]
        # Fast: Use only the first 1000 chars for classification
        result = clf(text[:1000], candidate_labels)
        return result['labels'][0]
    except Exception as e:
        print(f"❌ Local classification failed: {e}")
        return "general"
def summarize(text: str, category: str) -> str:
    """
    Summarization with category-specific rules.
    """
    if not text or len(text.strip()) < 20:
        return "Insufficient content to generate a summary."

    api_key = os.environ.get("GROQ_API_KEY")
    if api_key:
        try:
            print(f"🚀 Using Groq for {category} summary...")
            client = Groq(api_key=api_key)
            chunk = text[:12000]
            
            template_rules = "\n".join([f"- {r}" for r in SUMMARY_TEMPLATES.get(category.lower(), SUMMARY_TEMPLATES['general'])])
            
            prompt = f"""Summarize the following transcript as a {category} recording.
            
            Apply these rules:
            {template_rules}
            
            Rules:
            - Be thorough, detailed, and structured
            - Do not hallucinate information
            - Give a deep explanation of the content
            - Do not mention the template
            - Ensure the summary is comprehensive and lengthy
            
            TRANSCRIPT:
            {chunk}
            """
            
            chat_completion = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a professional content analysis assistant."},
                    {"role": "user", "content": prompt}
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.5,
            )
            return chat_completion.choices[0].message.content
        except Exception as e:
            print(f"⚠️ Groq summary failed: {e}. Falling back to local...")

    # Local fallback
    try:
        summarizer = get_summarizer()
        chunk = text[:3000]
        input_text = f"Expert summary for {category}. Content: {chunk}"
        summary = summarizer(input_text, max_length=150, min_length=40, do_sample=False, truncation=True)
        return summary[0]['summary_text']
    except Exception as e:
        print(f"❌ Local summarization failed: {e}")
        return text[:500] + "..." if len(text) > 500 else text

def transform_summary(text: str, format_type: str) -> str:
    """
    Transforms the transcript/summary into specialized formats:
    - Points: Structured bullet points
    - Mindmap: Educational mindmap/keynotes/flashcards
    - Speakers: Detailed breakdown of who said what
    """
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return "Transformation requires an active Groq API Key."

    prompts = {
        'points': "Create a highly structured, point-wise summary of this transcript using clear headings and bullet points. Focus on key decisions and outcomes.",
        'mindmap': "Transform this into an educational study guide. Include: 1. Main Concept Mindmap (text-based), 2. Set of Flashcards for key terms, 3. Critical Keynotes for students.",
        'speakers': "Perform detailed speaker attribution. Analyze the conversation and group the main points discussed by each person involved. If speakers aren't named, identify them as Speaker A, B, etc."
    }

    target_prompt = prompts.get(format_type, prompts['points'])
    
    try:
        client = Groq(api_key=api_key)
        chunk = text[:12000]
        
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are an expert educational and business consultant."},
                {"role": "user", "content": f"{target_prompt}\n\nTRANSCRIPT:\n{chunk}"}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.3,
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        print(f"❌ Transformation failed: {e}")
        return f"Error transforming content: {str(e)}"
