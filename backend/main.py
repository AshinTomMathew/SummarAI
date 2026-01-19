import uvicorn
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
import os
import shutil
import uuid
from datetime import datetime
from pathlib import Path
import sys
import traceback
import logging

# Global binary paths
FFMPEG_CMD = "ffmpeg"
FFPROBE_CMD = "ffprobe"

from app.utils.paths import get_binary_paths

# Global binary paths
FFMPEG_CMD, FFPROBE_CMD = get_binary_paths()

# Inject bundled binary paths into system PATH
def inject_binary_paths():
    global FFMPEG_CMD, FFPROBE_CMD
    root_dir = Path(__file__).parent.parent
    
    # Paths to bundled binaries in node_modules
    ffmpeg_dir = root_dir / "node_modules" / "ffmpeg-static"
    ffprobe_dir = root_dir / "node_modules" / "ffprobe-static" / "bin" / ("win32" if sys.platform == "win32" else "linux") / "x64"

    new_paths = []
    if ffmpeg_dir.exists():
        new_paths.append(str(ffmpeg_dir))
    if ffprobe_dir.exists():
        new_paths.append(str(ffprobe_dir))
        
    if new_paths:
        current_path = os.environ.get("PATH", "")
        path_sep = ";" if sys.platform == "win32" else ":"
        updated_path = path_sep.join(new_paths) + path_sep + current_path
        os.environ["PATH"] = updated_path
        
        # Export results to diagnostic file
        with open("backend_diagnostic.txt", "w") as f:
            f.write("--- BINARY PATH DIAGNOSTICS ---\n")
            f.write(f"Current Working Directory: {os.getcwd()}\n")
            f.write(f"Injected: {new_paths}\n")
            f.write(f"Final PATH: {os.environ.get('PATH', '')}\n")
            
            # Call get_binary_paths and log its results
            from app.utils.paths import get_binary_paths
            f_cmd, p_cmd = get_binary_paths()
            f.write(f"get_binary_paths() -> ffmpeg: {f_cmd}, ffprobe: {p_cmd}\n")
            
            import subprocess
            try:
                res = subprocess.run([f_cmd, "-version"], capture_output=True, text=True)
                f.write(f"ffmpeg absolute test success: {res.stdout[:50]}\n")
            except Exception as e:
                f.write(f"ffmpeg absolute test FAILED: {e}\n")
                f.write(traceback.format_exc())
                
            try:
                res = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True, shell=True) # Check PATH version
                f.write(f"ffmpeg PATH test success: {res.stdout[:50]}\n")
            except Exception as e:
                f.write(f"ffmpeg PATH test FAILED: {e}\n")

            try:
                res = subprocess.run([p_cmd, "-version"], capture_output=True, text=True)
                f.write(f"ffprobe absolute test success: {res.stdout[:50]}\n")
            except Exception as e:
                f.write(f"ffprobe absolute test FAILED: {e}\n")
                f.write(traceback.format_exc())
            f.write("-------------------------------\n")
        
        print("Backend diagnostics updated.")

inject_binary_paths()

# Services
import torch
from app.services.audio import normalize_audio, get_duration, compress_audio
from app.services.transcription import transcribe
from app.services.analysis import classify, summarize, analyze_transcript
from app.services.visuals import extract_visuals
from app.services.chat import answer_question
from app.services.export import export_pdf, export_docx
from app.db.models import init_db, SessionLocal, Session as DBSession

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB on startup
    print("🚀 Backend Startup: Initializing services and DB...")
    init_db()
    yield
    print("🛑 Backend Shutdown: Cleaning up...")

app = FastAPI(title="Summarai AI Backend", lifespan=lifespan)

# Global error logger
@app.middleware("http")
async def log_errors(request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        with open("backend_errors.log", "a") as f:
            f.write(f"\n--- ERROR AT {datetime.now()} ---\n")
            f.write(f"URL: {request.url}\n")
            f.write(traceback.format_exc())
            f.write("-" * 30 + "\n")
        raise e

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import tempfile

# Use system temp directory for all AI-processed media and exports
MEDIA_DIR = Path(tempfile.gettempdir()) / "SummarAI"
UPLOAD_DIR = MEDIA_DIR # For exported reports etc
MEDIA_DIR.mkdir(exist_ok=True)

@app.get("/health")
async def health_check():
    return {"status": "online", "timestamp": datetime.now().isoformat()}

@app.post("/audio/normalize")
async def api_normalize(path: str = Form(...)):
    print(f"📥 API: /audio/normalize - path: {path}")
    try:
        # Create a unique subfolder for this session
        session_id = str(uuid.uuid4())
        session_folder = MEDIA_DIR / session_id
        session_folder.mkdir(parents=True, exist_ok=True)
        
        # Normalize to temporary wav first
        temp_wav = normalize_audio(path)
        
        # Compress to final location immediately
        final_mp3 = str(session_folder / "processed.mp3")
        compress_audio(temp_wav, final_mp3)
        
        # Cleanup temp wav
        if os.path.exists(temp_wav):
            os.remove(temp_wav)
            
        duration = get_duration(final_mp3)
        print(f"✅ Normalized & Compressed: {final_mp3}, duration: {duration}")
        return {"success": True, "path": final_mp3, "duration": duration}
    except Exception as e:
        error_detail = traceback.format_exc()
        print(f"❌ Normalize Error:\n{error_detail}")
        return {"success": False, "error": str(e), "detail": error_detail}

@app.post("/audio/process-link")
async def api_process_link(url: str = Form(...)):
    try:
        import yt_dlp
        session_id = str(uuid.uuid4())
        session_folder = MEDIA_DIR / session_id
        session_folder.mkdir(parents=True, exist_ok=True)
        
        output_tmpl = str(session_folder / "download.%(ext)s")
        
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': output_tmpl,
            'noplaylist': True,
            'quiet': True,
            'no_check_certificate': True,
            'noprogress': True,
            'no_warnings': True,
            'extract_flat': 'in_playlist',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '32', # Ultra low bitrate for speed/size
            }],
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            title = info.get('title', 'Downloaded Video')
            final_path = str(session_folder / "download.mp3")
            
            if not os.path.exists(final_path):
                for f in session_folder.glob("download.*"):
                    if f.suffix == '.mp3':
                        final_path = str(f)
                        break

            print(f"✅ YT Downloaded & Compressed: {final_path}, Title: {title}")
            return {"success": True, "path": final_path, "title": title}
    except Exception as e:
        print(f"❌ YT Error: {e}")
        return {"success": False, "error": str(e)}

@app.post("/audio/transcribe")
async def api_transcribe(path: str = Form(...)):
    try:
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            
        text = transcribe(path)
        return {"success": True, "text": text}
    except Exception as e:
        error_detail = traceback.format_exc()
        print(f"❌ Transcribe Error:\n{error_detail}")
        return {"success": False, "error": str(e), "detail": error_detail}

@app.post("/audio/compress")
async def api_compress(path: str = Form(...)):
    """
    Compresses the analyzed file to save space (Internal use).
    Stores results in the system temp directory.
    """
    try:
        if not os.path.exists(path):
            return {"success": False, "error": "File not found"}
            
        file_path = Path(path)
        # Create a unique filename in the temp MEDIA_DIR
        compressed_filename = f"compressed_{uuid.uuid4().hex[:8]}_{file_path.stem}.mp3"
        compressed_path = str(MEDIA_DIR / compressed_filename)
        
        success = compress_audio(path, compressed_path)
        if success:
            return {"success": True, "path": compressed_path}
        else:
            return {"success": False, "error": "Compression failed"}
    except Exception as e:
        return {"success": False, "error": str(e)}

from app.services.analysis import classify, summarize, analyze_transcript, transform_summary

@app.post("/analysis/analyze")
async def api_analyze_unified(text: str = Form(...)):
    try:
        result = analyze_transcript(text)
        return {"success": True, **result}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/analysis/transform")
async def api_transform(text: str = Form(...), format_type: str = Form(...)):
    try:
        result = transform_summary(text, format_type)
        return {"success": True, "transformed": result}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/analysis/classify")
async def api_classify(text: str = Form(...)):
    try:
        # Use the unified engine even for separate classify calls for better accuracy if available
        result = analyze_transcript(text)
        return {"success": True, "category": result["category"]}
    except Exception as e:
        # Fallback to local classify if unified fails
        try:
            category = classify(text)
            return {"success": True, "category": category}
        except Exception as e2:
            return {"success": False, "error": str(e2)}

@app.post("/analysis/summarize")
async def api_summarize(text: str = Form(...), category: str = Form(...)):
    try:
        # If we have the category, we can still use the unified engine which is better
        # Or just use the improved summarize function
        summary_text = summarize(text, category)
        return {"success": True, "summary": summary_text}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/analysis/extract-visuals")
async def api_extract_visuals(path: str = Form(...)):
    try:
        visuals = extract_visuals(path)
        return {"success": True, "visuals": visuals}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/chat/query")
async def chat_query(query: str = Form(...), transcript: str = Form(...)):
    try:
        answer = answer_question(query, transcript)
        return {"success": True, "answer": answer}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/export")
async def export_report(
    format: str = Form(...),
    title: str = Form(...),
    summary: str = Form(...),
    transcript: str = Form(...)
):
    data = {"title": title, "summary": summary, "transcript": transcript}
    file_name = f"{title.replace(' ', '_')}_{uuid.uuid4().hex[:8]}.{format}"
    output_path = UPLOAD_DIR / file_name
    
    try:
        if format == "pdf":
            export_pdf(data, str(output_path))
        elif format == "docx":
            export_docx(data, str(output_path))
        elif format == "txt":
            with open(output_path, "w") as f:
                f.write(f"TITLE: {title}\n\nSUMMARY:\n{summary}\n\nTRANSCRIPT:\n{transcript}")
        else:
            return {"success": False, "error": "Invalid format"}
            
        return {"success": True, "download_url": str(output_path)}
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
