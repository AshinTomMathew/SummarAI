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
import json
import re
import time
import os
import signal
from sqlalchemy import text
import psutil
import socket

def kill_existing_process_on_port(port):
    """Kills any process currently listening on the specified port. Disabled on Render."""
    if os.environ.get("RENDER"):
        return False
        
    for proc in psutil.process_iter(['pid', 'name']):
        try:
            for conn in proc.connections(kind='inet'):
                if conn.laddr.port == port:
                    print(f"Port {port} is occupied by {proc.info['name']} (PID: {proc.info['pid']}). Killing it...")
                    proc.send_signal(signal.SIGTERM) if os.name != 'nt' else proc.terminate()
                    # Wait a moment for the OS to release the socket
                    time.sleep(1)
                    return True
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue
    return False

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

# Force UTF-8 for stdout/stderr to handle emojis on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        # Python < 3.7 or special environments
        pass

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
        print("Backend injected FFMPEG path successfully.")

inject_binary_paths()

# Services
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
    print("Backend Startup: Initializing services and DB...")
    init_db()
    yield
    print("Backend Shutdown: Cleaning up...")

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

@app.post("/audio/upload")
async def api_upload_audio(file: UploadFile = File(...)):
    print(f"📥 API: /audio/upload - filename: {file.filename}")
    try:
        # Create a unique subfolder for this session
        session_id = str(uuid.uuid4())
        session_folder = MEDIA_DIR / session_id
        session_folder.mkdir(parents=True, exist_ok=True)
        
        # Save the uploaded file
        final_mp3 = str(session_folder / "processed.mp3")
        with open(final_mp3, "wb") as f:
            f.write(await file.read())
            
        duration = round(get_duration(final_mp3))
        print(f"✅ Uploaded & Saved: {final_mp3}, duration: {duration}")
        return {"success": True, "path": final_mp3, "duration": duration}
    except Exception as e:
        print(f"❌ Upload Error: {e}")
        return {"success": False, "error": str(e)}

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
            
        duration = round(get_duration(final_mp3))
        print(f"✅ Normalized & Compressed: {final_mp3}, duration: {duration}")
        return {"success": True, "path": final_mp3, "duration": duration, "originalPath": path}
    except Exception as e:
        error_detail = traceback.format_exc()
        print(f"❌ Normalize Error:\n{error_detail}")
        return {"success": False, "error": str(e), "detail": error_detail}

@app.post("/audio/process-link")
async def api_process_link(url: str = Form(...)):
    try:
        import yt_dlp
        import re
        
        # URL validation
        url = url.strip()
        if not url:
            return {"success": False, "error": "URL cannot be empty"}
        
        # URL validation - Accept any valid HTTP/HTTPS URL (yt-dlp supports 1000+ sites)
        url_pattern = r'^https?://.+'
        if not re.match(url_pattern, url, re.IGNORECASE):
            return {"success": False, "error": "Invalid URL format. Please provide a valid HTTP or HTTPS link."}
        
        # Ensure we have the latest binary paths
        ffmpeg_bin, _ = get_binary_paths()
        ffmpeg_dir = str(Path(ffmpeg_bin).parent) if ffmpeg_bin else None
        
        session_id = str(uuid.uuid4())
        session_folder = MEDIA_DIR / session_id
        session_folder.mkdir(parents=True, exist_ok=True)
        
        output_tmpl = str(session_folder / "download.%(ext)s")
        
        # Bulletproof yt-dlp configuration (Fixes NoneType Error)
        ydl_opts = {
            'format': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080]/best',
            'outtmpl': output_tmpl,
            'ignoreconfig': True,
            'quiet': True,
            'no_warnings': True,
            'ffmpeg_location': ffmpeg_dir if ffmpeg_dir and os.path.exists(ffmpeg_dir) else None,
            'hls_prefer_native': True, 
            'dash_prefer_native': True,
            'extractor_args': {'youtube': {'player_client': ['android', 'ios', 'web']}},
            'postprocessors': [{
                'key': 'FFmpegVideoConvertor',
                'preferedformat': 'mp4',
            }],
        }
        
        print(f"🔗 Neural Link Processing (Direct): {url}")
        
        # Use a thread pool to run the synchronous yt-dlp call with a timeout
        import asyncio
        from concurrent.futures import ThreadPoolExecutor
        
        def download_process():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                return ydl.extract_info(url, download=True)

        try:
            loop = asyncio.get_event_loop()
            with ThreadPoolExecutor() as pool:
                # Run the download until it completes naturally without a forced timeout
                info = await loop.run_in_executor(pool, download_process)
                
                if not info:
                    print(f"❌ Link processing failed: No info returned for {url}")
                    return {"success": False, "error": "Neural Link Error: Could not extract information from this link."}

                title = info.get('title', 'Meeting Audio')
                duration = info.get('duration', 0.0)
                
                # Verify downloaded file
                time.sleep(0.3)
                final_path = None
                valid_exts = ['.mp4', '.mp3', '.opus', '.webm', '.m4a', '.ogg', '.wav', '.aac']
                
                for file_path in session_folder.glob("*"):
                    if file_path.suffix.lower() in valid_exts and file_path.stat().st_size > 1024:
                        final_path = str(file_path)
                        break
                
                if not final_path:
                    return {"success": False, "error": "Audio stream captured but could not be verified locally."}

                print(f"✅ Neural Source Ready: {final_path}")
                return {"success": True, "path": final_path, "title": title, "duration": round(duration)}
                
        except Exception as e:
            import sys
            import yt_dlp
            print(f"❌ Core Link Failure: {traceback.format_exc()}")
            print(f"🔍 Diagnostic: Python Version={sys.version}")
            print(f"🔍 Diagnostic: yt-dlp Version={yt_dlp.version.__version__}")
            print(f"🔍 Diagnostic: yt-dlp Path={yt_dlp.__file__}")
            return {"success": False, "error": f"Neural Link Error: Internal downloader failure. Please restart the app and try again."}
            
    except ImportError:
        return {"success": False, "error": "Dependency Missing: yt-dlp not found in backend environment."}
    except Exception as e:
        print(f"❌ Unexpected Error: {str(e)}")
        return {"success": False, "error": "Critical System Fault: Unable to process link."}

@app.post("/audio/transcribe")
async def api_transcribe(path: str = Form(...)):
    try:
        try:
            import torch
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        except ImportError:
            pass
            
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

@app.post("/chat/query")
async def api_chat_query(query: str = Form(...), transcript: str = Form(None), summary: str = Form(None), visuals: str = Form(None)):
    try:
        response = answer_question(query, transcript or "", summary or "", visuals or "")
        return {"success": True, "response": response}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/analysis/extract-visuals")
async def api_extract_visuals(path: str = Form(...)):
    try:
        visuals = extract_visuals(path)
        return {"success": True, "visuals": visuals}
    except Exception as e:
        return {"success": False, "error": str(e)}



@app.post("/export")
async def export_report(
    format: str = Form(...),
    title: str = Form(...),
    summary: str = Form(...),
    transcript: str = Form(...),
    visuals: str = Form(default="[]")
):
    try:
        # Parse visuals from JSON string
        try:
            visuals_data = json.loads(visuals)
        except:
            visuals_data = []

        data = {
            "title": title, 
            "summary": summary, 
            "transcript": transcript,
            "visuals": visuals_data
        }
        
        # Ensure export directory exists
        export_dir = os.path.join(tempfile.gettempdir(), "SummarAI", "exports")
        os.makedirs(export_dir, exist_ok=True)
        
        filename = f"Report_{re.sub(r'[^a-zA-Z0-9]', '_', title)}_{int(time.time())}.{format}"
        output_path = os.path.join(export_dir, filename)
        
        if format == "pdf":
            export_pdf(data, output_path)
        elif format == "docx":
            export_docx(data, output_path)
        elif format == "txt":
            # Simple TXT export logic directly here
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(f"Title: {title}\n\n")
                f.write(f"Summary:\n{summary}\n\n")
                if visuals_data:
                    f.write(f"Visual Insights ({len(visuals_data)} slides):\n")
                    for v in visuals_data:
                        v_text = v.get('text', '').replace('\n', ' ')
                        f.write(f"- [{v.get('timestamp')}] {v_text}\n")
                    f.write("\n")
                f.write(f"Transcript:\n{transcript}\n")
        else:
            return {"success": False, "error": "Unsupported format"}
            
        return {"success": True, "path": output_path}
    except Exception as e:
        print(f"❌ Export Error: {e}")
        return {"success": False, "error": str(e)}

@app.get("/test-db")
def test_db():
    from database import SessionLocal
    db = SessionLocal()
    result = db.execute(text("SELECT * FROM users"))
    data = [dict(row) for row in result]
    return {"database_data": data}

if __name__ == "__main__":
    import os
    # Priority: Env PORT -> 1001
    PORT = int(os.environ.get("PORT", 1001))
    
    # Only kill process if on local dev (not Render/Cloud)
    if not os.environ.get("RENDER") and is_port_in_use(PORT):
        kill_existing_process_on_port(PORT)
        
    print(f"Main Entry Point: Starting Uvicorn on {PORT}...")
    # host must be 0.0.0.0 for Render to route traffic
    host = "0.0.0.0" if os.environ.get("RENDER") else "127.0.0.1"
    uvicorn.run(app, host=host, port=PORT, reload=False, workers=1)