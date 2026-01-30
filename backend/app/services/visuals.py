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
            print(f"✅ Tesseract found at: {p}")
            break
    else:
        # Check if in PATH
        tesseract_in_path = shutil.which("tesseract")
        if tesseract_in_path:
            pytesseract.pytesseract.tesseract_cmd = tesseract_in_path
            print(f"✅ Tesseract found in PATH: {tesseract_in_path}")
        else:
            print("ℹ️ Tesseract OCR not found. Visual extraction will continue without text recognition.")
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

def extract_visuals(video_path: str) -> List[Dict]:
    """
    OFFLINE: Extracts keyframes using FFmpeg (ULTRA FAST) and performs OCR.
    SPEED OPTIMIZED: Uses FFmpeg to jump to specific timestamps.
    """
    print(f"📸 Visual Extraction Request: {video_path}")
    abs_video_path = os.path.abspath(video_path)
    
    if not os.path.exists(abs_video_path):
        print(f"⏭️ Visual extraction skipped: File not found at {abs_video_path}")
        return []

    # Verify if it's a video file by checking extension
    ext = os.path.splitext(abs_video_path)[1].lower()
    if ext not in ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv']:
        print(f"⏭️ Visual extraction skipped: Audio-only file ({ext}). No video frames to extract.")
        return []

    visuals_dir = Path(tempfile.gettempdir()) / "SummarAI" / "visuals"
    visuals_dir.mkdir(parents=True, exist_ok=True)
    
    session_id = f"vid_{int(time.time())}"
    session_dir = visuals_dir / session_id
    session_dir.mkdir(parents=True, exist_ok=True)

    results = []
    
    try:
        # Get duration using ffprobe or cv2
        cap = cv2.VideoCapture(abs_video_path)
        if not cap.isOpened():
            print("⏭️ Visual extraction skipped: Video file is corrupted or unsupported format.")
            return []
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if fps <= 0: fps = 30
        duration_sec = total_frames / fps
        cap.release()

        # Decide timestamps to capture (max 15 slides for faster processing, evenly spaced across the WHOLE video)
        num_slides = 15
        if duration_sec < 60:
            num_slides = 5
        elif duration_sec < 300:
            num_slides = 10
            
        interval = duration_sec / (num_slides + 1)
        timestamps = [interval * i for i in range(1, num_slides + 1)]

        print(f"🕒 Extracting {len(timestamps)} frames at 1080p resolution...")

        for ts in timestamps:
            mm = int(ts // 60)
            ss = int(ts % 60)
            filename = f"slide_{mm:02d}_{ss:02d}.jpg"
            frame_path = str(session_dir / filename)
            
            # ULTRA-RES extraction using FFmpeg seeking
            # Scale to 1920 (1080p width) for premium quality slides
            cmd = [
                'ffmpeg', '-y', '-ss', f"{ts:.2f}", '-i', abs_video_path,
                '-frames:v', '1', '-q:v', '2', 
                '-vf', 'scale=1920:-1',
                frame_path
            ]
            
            try:
                subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=5)
                
                if os.path.exists(frame_path):
                    # Perform OCR
                    clean_text = ""
                    ocr_status = "Skipped"
                    
                    # Only attempt OCR if Tesseract is configured
                    if getattr(pytesseract.pytesseract, 'tesseract_cmd', None):
                        try:
                            # Load with PIL for Tesseract
                            img = Image.open(frame_path)
                            text = pytesseract.image_to_string(img, config='--psm 3 --oem 1')
                            clean_text = text.strip()
                            ocr_status = "Success" if clean_text else "No Text Found"
                        except PermissionError:
                            ocr_status = "Permission Denied"
                        except OSError as e:
                            if "740" in str(e) or "elevation" in str(e).lower():
                                ocr_status = "Permission Denied"
                            else:
                                ocr_status = "Failed"
                        except Exception as e:
                            ocr_status = "Failed"
                    
                    timestamp_str = f"{mm:02d}:{ss:02d}"
                    final_text = clean_text if clean_text else f"[Visual Context at {timestamp_str}]"
                    
                    results.append({
                        "timestamp": timestamp_str,
                        "text": final_text,
                        "path": frame_path,
                        "ocr_status": ocr_status
                    })
            except Exception as e:
                print(f"⚠️ FFmpeg frame extraction failed at {ts}s: {e}")
                continue

        if len(results) > 0:
            print(f"✅ Visual Extraction Complete: {len(results)} frames extracted.")
        else:
            print(f"⏭️ Visual extraction skipped: No frames could be extracted from this video.")
        return results

    except Exception as e:
        print(f"❌ Visual Extraction Fatal Error: {e}")
        return []
