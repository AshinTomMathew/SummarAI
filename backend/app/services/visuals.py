import os
import cv2
import numpy as np
import pytesseract
from PIL import Image
from pathlib import Path
from typing import List, Dict
import tempfile
import sys
import shutil
import time
from app.utils.paths import get_binary_paths
from app.services.audio import get_duration

# Auto-detect Tesseract on Windows
if sys.platform == "win32":
    # Standard installation paths for Tesseract (System and User)
    possible_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files\Tesseract OCR\Tesseract OCR.exe",
        r"C:\Program Files\Tesseract OCR\tesseract.exe",
        r"C:\Program Files\Tesseract-OCR\tesseract-ocr.exe",
        os.path.join(os.getenv("LOCALAPPDATA", ""), r"Tesseract-OCR\tesseract.exe"),
        os.path.join(os.getenv("APPDATA", ""), r"Tesseract-OCR\tesseract.exe"),
        # Common chocolatey/scoop paths
        r"C:\tools\tesseract-ocr\tesseract.exe",
        r"C:\ProgramData\chocolatey\bin\tesseract.exe"
    ]
    for p in possible_paths:
        if os.path.exists(p):
            pytesseract.pytesseract.tesseract_cmd = p
            print(f"Tesseract found at: {p}")
            break
    else:
        # Check if in PATH
        tesseract_in_path = shutil.which("tesseract")
        if tesseract_in_path:
            pytesseract.pytesseract.tesseract_cmd = tesseract_in_path
            print(f"Tesseract found in PATH: {tesseract_in_path}")
        else:
            print("Tesseract OCR not found. Visual extraction will continue without text recognition.")
            print("   Images will still be extracted, but OCR text will be skipped.")

def get_frame_difference(frame1, frame2):
    """
    Calculates the difference between two frames using Mean Squared Error (MSE)
    on grayscale resized versions. Returns a score (higher = more different).
    """
    try:
        # Convert to grayscale
        gray1 = cv2.cvtColor(frame1, cv2.COLOR_BGR2GRAY)
        gray2 = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY)
        
        # Resize to small thumbnail for fast comparison
        small1 = cv2.resize(gray1, (64, 64))
        small2 = cv2.resize(gray2, (64, 64))
        
        # Calculate MSE
        err = np.sum((small1.astype("float") - small2.astype("float")) ** 2)
        err /= float(small1.shape[0] * small1.shape[1])
        return err
    except Exception:
        return 0

import subprocess
from concurrent.futures import ThreadPoolExecutor

def extract_visuals(video_path: str) -> List[Dict]:
    """
    OFFLINE: Extracts keyframes using FFmpeg (ULTRA FAST) and performs OCR.
    SPEED OPTIMIZED: Uses FFmpeg to jump to specific timestamps.
    """
    # Clean and normalize path
    clean_path = video_path.strip().strip('"')
    print(f"[VISUALS] Request: {clean_path}")
    
    video_p = Path(clean_path).resolve()
    abs_video_path = str(video_p)
    print(f"[VISUALS] DEBUG: Resolved path: {abs_video_path}")
    
    if not video_p.exists():
        print(f"[VISUALS] Skipped: File not found at {abs_video_path}")
        # Try a quick secondary check in case of OS character encoding oddities
        if not os.path.exists(abs_video_path):
             return []
        print("[VISUALS] Found via os.path.exists fallback.")

    import ffmpeg
    from app.utils.paths import get_binary_paths
    FFMPEG_CMD, FFPROBE_CMD = get_binary_paths()
    print(f"DEBUG: Binaries -> FFMPEG: {FFMPEG_CMD}, FFPROBE: {FFPROBE_CMD}")

    try:
        print(f"DEBUG: Probing video stream...")
        probe = ffmpeg.probe(abs_video_path, cmd=FFPROBE_CMD)
        video_streams = [s for s in probe.get('streams', []) if s.get('codec_type') == 'video']
        if not video_streams:
            print(f"[VISUALS] Skipped: No video stream found in {abs_video_path}")
            return []
        print(f"[VISUALS] Found {len(video_streams)} video stream(s).")
    except Exception as e:
        print(f"[VISUALS] Metadata probe failed: {e}")
        # Fallback to extension check if probe fails
        ext = os.path.splitext(abs_video_path)[1].lower()
        if ext not in ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv']:
            print(f"[VISUALS] Skipped: File extension {ext} not recognized.")
            return []

    visuals_dir = Path(tempfile.gettempdir()).resolve() / "SummarAI" / "visuals"
    visuals_dir.mkdir(parents=True, exist_ok=True)
    
    import uuid
    session_id = f"vid_{int(time.time())}_{uuid.uuid4().hex[:6]}"
    session_dir = (visuals_dir / session_id).resolve()
    session_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"[VISUALS] Session directory: {session_dir}")

    def _process_timestamp(ts):
        """Helper to extract and OCR a single frame."""
        mm = int(ts // 60)
        ss = int(ts % 60)
        filename = f"slide_{mm:02d}_{ss:02d}.jpg"
        frame_path = str(session_dir / filename)
        
        # Get FFmpeg path
        ffmpeg_bin, _ = get_binary_paths()
        
        # Seek and extract frame (Ultra-fast seeks)
        cmd = [
            ffmpeg_bin, '-y', '-ss', f"{ts:.2f}", '-i', abs_video_path,
            '-frames:v', '1', '-q:v', '2', 
            '-vf', 'scale=1920:-1',
            frame_path
        ]
        
        try:
            # Process with a longer timeout or none for large frames
            print(f"🎬 [VISUALS] Extracting frame at {ts}s to: {frame_path}")
            # Use shell=True only on windows if needed, but absolute path is better
            startupinfo = None
            if sys.platform == "win32":
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                
            # Speed optimized: 1280px width is enough for most UIs and faster to extract/OCR
            res = subprocess.run(
                [
                    ffmpeg_bin, '-y', '-ss', f"{ts:.2f}", '-i', abs_video_path,
                    '-frames:v', '1', '-q:v', '4', 
                    '-vf', 'scale=1280:-1',
                    frame_path
                ], 
                stdout=subprocess.PIPE, 
                stderr=subprocess.PIPE, 
                text=True,
                startupinfo=startupinfo
            )
            
            if res.returncode != 0:
                print(f"[VISUALS] FFmpeg error at {ts}s: {res.stderr}")
            else:
                print(f"[VISUALS] Frame extracted at {ts}s")
            
            if os.path.exists(frame_path):
                # Perform OCR
                clean_text = ""
                ocr_status = "Skipped"
                
                if getattr(pytesseract.pytesseract, 'tesseract_cmd', None):
                    try:
                        img = Image.open(frame_path)
                        text = pytesseract.image_to_string(img, config='--psm 3 --oem 1')
                        clean_text = text.strip()
                        ocr_status = "Success" if clean_text else "No Text Found"
                    except Exception:
                        ocr_status = "Failed"
                
                timestamp_str = f"{mm:02d}:{ss:02d}"
                return {
                    "timestamp": timestamp_str,
                    "text": clean_text if clean_text else f"[Visual Context at {timestamp_str}]",
                    "path": frame_path,
                    "ocr_status": ocr_status
                }
        except Exception as e:
            print(f"Extraction failed for {ts}s: {e}")
        return None

    try:
        duration_sec = get_duration(abs_video_path)
        print(f"Video Duration determined: {duration_sec}s")
        
        if duration_sec <= 0:
            print(f"Could not determine video duration for {abs_video_path}")
            return []

        # Calculate capture points
        num_slides = 12
        if duration_sec < 60: num_slides = 4
        elif duration_sec < 300: num_slides = 8
            
        interval = duration_sec / (num_slides + 1)
        timestamps = [interval * i for i in range(1, num_slides + 1)]
        
        print(f"Planned extraction points: {[f'{t:.2f}s' for t in timestamps]}")

        print(f"Parallel extracting {len(timestamps)} frames at 1080p...")

        # Run extraction in parallel (up to 8 tasks)
        print(f"[VISUALS] Starting parallel extraction of {len(timestamps)} frames...")
        with ThreadPoolExecutor(max_workers=min(len(timestamps), 8)) as executor:
            task_results = list(executor.map(_process_timestamp, timestamps))
            
        # Filter None values, fix paths for URL compatibility, and sort by time
        results = []
        for r in task_results:
            if r:
                # Normalize path to use forward slashes for the frontend media:// protocol
                # CRITICAL: Ensure we keep a leading forward slash if it starts with drive letter
                # Actually, media://C:/Users... is fine if C: is treated as host.
                # But let's be safe and consistent.
                r['path'] = r['path'].replace('\\', '/')
                results.append(r)
        
        results.sort(key=lambda x: x['timestamp'])

        print(f"[VISUALS] Extraction Complete: {len(results)}/{len(timestamps)} frames succeeded.")
        if not results:
            print("[VISUALS] WARNING: No visuals were successfully extracted!")
        return results

    except Exception as e:
        print(f"Visual Extraction Fatal Error: {e}")
        return []
