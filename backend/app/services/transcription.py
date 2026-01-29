import os
import gc
import torch
from faster_whisper import WhisperModel
from groq import Groq
from app.services.audio import compress_audio
import tempfile
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

_model = None

def get_model():
    global _model
    if _model is None:
        # Use 'tiny.en' for local fallback (fastest local)
        model_size = "tiny.en"
        
        # Check for GPU (NVIDIA CUDA)
        device = "cuda" if torch.cuda.is_available() else "cpu"
        # int8 for CPU, float16/int8_float16 for GPU
        compute_type = "int8_float16" if device == "cuda" else "int8"
        
        print(f"┬á┬á Initializing Whisper ({model_size}) on {device.upper()}...")
        _model = WhisperModel(model_size, device=device, compute_type=compute_type, cpu_threads=4)
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
            current_path = audio_path
            file_size_mb = os.path.getsize(current_path) / (1024 * 1024)
            
            # Groq has a 25MB limit. If file is larger, compress it on the fly.
            if file_size_mb > 24.5:
                print(f"┬á┬á Large file detected ({file_size_mb:.1f}MB). Compressing for Groq speed...")
                temp_compressed = Path(tempfile.gettempdir()) / f"groq_prep_{os.path.basename(audio_path)}.mp3"
                if compress_audio(audio_path, str(temp_compressed)):
                    current_path = str(temp_compressed)
                    print(f"┬á┬á Compressed to {os.path.getsize(current_path)/(1024*1024):.1f}MB")

            print("≡ƒÜÇ Using Groq Cloud for near-instant transcription...")
            client = Groq(api_key=api_key)
            with open(current_path, "rb") as file:
                transcription = client.audio.transcriptions.create(
                    file=(os.path.basename(current_path), file.read()),
                    model="whisper-large-v3-turbo", 
                    response_format="text",
                )
            
            # Cleanup temp file if created
            if current_path != audio_path and os.path.exists(current_path):
                os.remove(current_path)
                
            return transcription.strip()
        except Exception as groq_err:
            error_str = str(groq_err)
            # Check for specific error types
            if "500" in error_str or "Internal Server Error" in error_str or "Internaal Server Error" in error_str:
                print("⚠️ Groq service temporarily unavailable (server error). Using local transcription...")
            elif "401" in error_str or "403" in error_str:
                print("⚠️ Groq API authentication failed. Using local transcription...")
            elif "429" in error_str:
                print("⚠️ Groq API rate limit reached. Using local transcription...")
            else:
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
