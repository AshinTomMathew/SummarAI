from transformers import pipeline
import torch
# Optimization: Set torch threads globally for better CPU performance
torch.set_num_threads(4)

_chatbot = None

def get_chatbot():
    global _chatbot
    if _chatbot is None:
        # Using a small QA model for strictly transcript-based answers
        _chatbot = pipeline("question-answering", model="distilbert-base-cased-distilled-squad", device=-1)
    return _chatbot

def answer_question(question: str, transcript: str) -> str:
    """
    Answers questions strictly from the provided transcript.
    """
    print(f"💬 Chat Query: {question}")
    if not transcript or len(transcript.strip()) < 10:
        return "I don't have enough context from the meeting to answer that. Please wait for the transcript to be generated."

    qa = get_chatbot()
    # Truncate context to model limits
    context = transcript[:2000]
    result = qa(question=question, context=context)
    
    print(f"💬 Chat Result: Score={result['score']:.4f}, Answer={result['answer']}")

    if result['score'] < 0.05: # Slightly lower threshold for CPU models
        return "I'm sorry, I couldn't find a clear answer to that in the meeting transcript. Could you try rephrasing?"
        
    return result['answer']
