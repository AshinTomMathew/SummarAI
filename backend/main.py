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
        import re
        
        # URL validation
        url = url.strip()
        if not url:
            return {"success": False, "error": "URL cannot be empty"}
        
        # Support broad range of platforms
        url_pattern = r'^https?://(www\.)?(youtube\.com|youtu\.ae|vimeo\.com|dailymotion\.com|soundcloud\.com|twitch\.tv|facebook\.com|instagram\.com|linkedin\.com|twitter\.com|x\.com)'
        if not re.match(url_pattern, url, re.IGNORECASE):
            return {"success": False, "error": "Neural Link: This platform is not supported or the URL is malformed."}
        
        # Ensure we have the latest binary paths
        ffmpeg_bin, _ = get_binary_paths()
        ffmpeg_dir = str(Path(ffmpeg_bin).parent) if ffmpeg_bin else None
        
        session_id = str(uuid.uuid4())
        session_folder = MEDIA_DIR / session_id
        session_folder.mkdir(parents=True, exist_ok=True)
        
        output_tmpl = str(session_folder / "download.%(ext)s")
        
        # Ultra-fast yt-dlp for audio-only context extraction
        ydl_opts = {
            # Use 'worstaudio' or small extensions to minimize data transfer
            'format': 'worstaudio[ext=m4a]/worstaudio[ext=webm]/worstaudio/bestaudio',
            'outtmpl': output_tmpl,
            'noplaylist': True,
            'quiet': True,
            'no_check_certificate': True,
            'noprogress': True,
            'no_warnings': True,
            'extract_flat': False,
            'skip_download': False,
            'ffmpeg_location': ffmpeg_dir if ffmpeg_dir and os.path.exists(ffmpeg_dir) else None,
            'concurrent_fragments': 10,
            'http_chunk_size': 10485760, # 10MB chunks
            'fragment_retries': 2,
            'retries': 2,
            'no_color': True,
            'geo_bypass': True,
            'check_formats': False,
            'writesubtitles': False,
            'writeautomaticsub': False,
            'writethumbnail': False,
            'writedescription': False,
            'writeinfojson': False,
            'socket_timeout': 15,
            # Force external downloader for parallelization (if available)
            'external_downloader': 'builtin',
            'extractor_args': {'youtube': {'player_client': ['android', 'ios', 'web']}},
            'postprocessors': [], # Remove any default postprocessors to avoid re-encoding
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
                # Forcefully terminate if it takes more than 180 seconds (3 mins)
                try:
                    info = await asyncio.wait_for(
                        loop.run_in_executor(pool, download_process),
                        timeout=180.0
                    )
                except asyncio.TimeoutError:
                    print(f"🕒 Link processing TIMEOUT for: {url}")
                    return {"success": False, "error": "Neural Link Timeout: The source is taking too long to respond (>3 mins). Try a shorter video."}
                
                title = info.get('title', 'Meeting Audio')
                duration = info.get('duration', 0.0)
                
                # Verify downloaded file
                time.sleep(0.3)
                final_path = None
                valid_exts = ['.mp3', '.opus', '.webm', '.m4a', '.ogg', '.wav', '.aac']
                
                for file_path in session_folder.glob("*"):
                    if file_path.suffix.lower() in valid_exts and file_path.stat().st_size > 1024:
                        final_path = str(file_path)
                        break
                
                if not final_path:
                    return {"success": False, "error": "Audio stream captured but could not be verified locally."}

                print(f"✅ Neural Source Ready: {final_path}")
                return {"success": True, "path": final_path, "title": title, "duration": duration}
                
        except Exception as e:
            print(f"❌ Core Link Failure: {traceback.format_exc()}")
            return {"success": False, "error": f"Neural Core Exception: {str(e)[:100]}"}
            
    except ImportError:
        return {"success": False, "error": "Dependency Missing: yt-dlp not found in backend environment."}
    except Exception as e:
        print(f"❌ Unexpected Error: {str(e)}")
        return {"success": False, "error": "Critical System Fault: Unable to process link."}

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
                        f.write(f"- [{v.get('timestamp')}] {v.get('text', '').replace('\n', ' ')}\n")
                    f.write("\n")
                f.write(f"Transcript:\n{transcript}\n")
        else:
            return {"success": False, "error": "Unsupported format"}
            
        return {"success": True, "path": output_path}
    except Exception as e:
        print(f"❌ Export Error: {e}")
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    print("🚀 Main Entry Point: Starting Uvicorn...")
    # workers=1 and reload=False are CRITICAL for Electron integration
    uvicorn.run(app, host="127.250.0.0", port=2611, reload=False, workers=1)
