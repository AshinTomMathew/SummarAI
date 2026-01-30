import os
import gc
import torch
import subprocess
from faster_whisper import WhisperModel
from groq import Groq
from app.services.audio import compress_audio, get_duration
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
        
        # Use all available CPU threads for maximum power
        threads = os.cpu_count() or 4
        
        print(f"┬á┬á Initializing Whisper ({model_size}) on {device.upper()} with MAX {threads} threads...")
        _model = WhisperModel(model_size, device=device, compute_type=compute_type, cpu_threads=threads)
    return _model

def transcribe(audio_path: str) -> str:
    if not os.path.exists(audio_path):
        return ""

    # NEW: Duration Bypass logic. 
    # Check duration. If > 10 mins, split it to stay under Groq's 7200s limit.
    duration = get_duration(audio_path)
    
    # Get all available Groq keys
    groq_keys = [os.environ.get(f"GROQ_API_KEY{suffix}") for suffix in ["", "_2", "_3"]]
    groq_keys = [k for k in groq_keys if k]
    
    # If the file is small, send directly. If large, use chunked processing.
    if duration < 600: # Under 10 mins
        for i, api_key in enumerate(groq_keys):
            try:
                print(f"≡ƒÜÇ Using Groq Cloud ({i+1}) for direct transcription...")
                client = Groq(api_key=api_key)
                with open(audio_path, "rb") as file:
                    return client.audio.transcriptions.create(
                        file=(os.path.basename(audio_path), file.read()),
                        model="whisper-large-v3-turbo", 
                        response_format="text",
                    ).strip()
            except Exception as e:
                print(f"⚠️ Groq key {i+1} failed: {e}")
                continue
    else:
        # CHUNKED PROCESSING: Split into 10-min parts to bypass the 7200 limit
        print(f"📦 Long recording detected ({duration:.1f}s). Splitting into chunks to bypass 7200 limit...")
        try:
            # We use ffmpeg to split quickly without loading into memory
            full_transcript = []
            chunk_size = 600 # 10 minutes
            for start in range(0, int(duration), chunk_size):
                chunk_path = Path(tempfile.gettempdir()) / f"chunk_{start}.mp3"
                # Extract chunk
                subprocess.run(['ffmpeg', '-y', '-ss', str(start), '-t', str(chunk_size), '-i', audio_path, '-acodec', 'libmp3lame', '-ar', '16000', str(chunk_path)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                
                # Transcribe chunk using key rotation
                chunk_text = ""
                for k_idx, api_key in enumerate(groq_keys):
                    try:
                        client = Groq(api_key=api_key)
                        with open(chunk_path, "rb") as f:
                            chunk_text = client.audio.transcriptions.create(
                                file=(f"chunk_{start}.mp3", f.read()),
                                model="whisper-large-v3-turbo", 
                                response_format="text",
                            ).strip()
                        break 
                    except: continue
                
                if chunk_text: full_transcript.append(chunk_text)
                if os.path.exists(chunk_path): os.remove(chunk_path)
            
            if full_transcript:
                return " ".join(full_transcript)
        except Exception as e:
            print(f"⚠️ Chunked Groq failed: {e}. Falling back to local...")

    # 3. Local Fallback (Faster-Whisper) - ULTRA FAST OPTIMIZED
    try:
        gc.collect() 
        model = get_model()
        print(f"🎤 Starting local transcription (ULTRA-FAST) for: {audio_path}")
        
        segments, info = model.transcribe(
            audio_path, 
            beam_size=1, 
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=300, speech_pad_ms=200),
            initial_prompt="Meeting transcript.",
            condition_on_previous_text=False
        )
        
        return " ".join([s.text for s in segments]).strip()
    except Exception as e:
        print(f"❌ Transcription failed: {e}")
        return "Transcription error occurred."
