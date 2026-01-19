import os
import gc
from faster_whisper import WhisperModel
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

_model = None

def get_model():
    global _model
    if _model is None:
        # Use 'tiny.en' for local fallback (fastest local)
        model_size = "tiny.en"
        # Run on CPU by default. int8 quantization for speed.
        _model = WhisperModel(model_size, device="cpu", compute_type="int8", cpu_threads=4)
    return _model

def transcribe(audio_path: str) -> str:
    """
    Transcribes audio using Groq (Ultra-Fast) with local Faster-Whisper fallback.
    """
    if not os.path.exists(audio_path):
        return ""

    # 1. Try Groq for extreme speed (Sub-second processing)
    api_key = os.environ.get("GROQ_API_KEY")
    if api_key:
        try:
            print("🚀 Using Groq Cloud for near-instant transcription...")
            client = Groq(api_key=api_key)
            with open(audio_path, "rb") as file:
                transcription = client.audio.transcriptions.create(
                    file=(os.path.basename(audio_path), file.read()),
                    model="whisper-large-v3-turbo", # Turbo is significantly faster
                    response_format="text",
                )
            return transcription.strip()
        except Exception as groq_err:
            print(f"⚠️ Groq transcription failed: {groq_err}. Falling back to local...")

    # 2. Local Fallback (Faster-Whisper)
    try:
        gc.collect() 
        model = get_model()
        print(f"🎤 Starting local transcription (Tiny) for: {audio_path}")
        
        # beam_size=1 and initial_prompt can speed things up
        segments, info = model.transcribe(
            audio_path, 
            beam_size=1, 
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500)
        )
        
        transcript = []
        for segment in segments:
            transcript.append(segment.text)
            
        return " ".join(transcript).strip()
    except Exception as e:
        print(f"❌ Local transcription failed: {e}")
        return "Transcription error occurred."
