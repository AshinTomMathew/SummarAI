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
    # Standard installation paths for Tesseract
    possible_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        os.path.join(os.getenv("LOCALAPPDATA", ""), r"Tesseract-OCR\tesseract.exe")
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

def extract_visuals(video_path: str) -> List[Dict]:
    """
    OFFLINE: Extracts keyframes using OpenCV and performs OCR.
    Uses smart frame differencing to avoid duplicates and captures slides every few seconds.
    """
    print(f"📸 Visual Extraction Request: {video_path}")
    abs_video_path = os.path.abspath(video_path)
    
    if not os.path.exists(abs_video_path):
        print(f"❌ Visuals Error: Video file not found: {abs_video_path}")
        return []

    visuals_dir = Path(tempfile.gettempdir()) / "SummarAI" / "visuals"
    visuals_dir.mkdir(parents=True, exist_ok=True)
    
    # Create unique session directory
    session_id = f"vid_{int(os.path.getmtime(abs_video_path))}_{os.path.basename(abs_video_path)}"
    session_dir = visuals_dir / session_id
    session_dir.mkdir(parents=True, exist_ok=True)

    results = []
    
    try:
        # Verify file is readable by OpenCV
        cap = cv2.VideoCapture(abs_video_path)
        if not cap.isOpened():
            print("❌ OpenCV failed to open video. Codec or path issue.")
            cap.release()
            return []
        
        # Additional validation: check if video has frames
        ret, test_frame = cap.read()
        if not ret or test_frame is None:
            print("❌ Video file appears to be empty or corrupted.")
            cap.release()
            return []
        # Reset to beginning
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps <= 0: fps = 30 # Fallback
        
        # OPTIMIZATION: Check every 15 seconds instead of 5 to speed up processing significantly
        interval_seconds = 15 
        frame_step = int(fps * interval_seconds)
        if frame_step == 0: frame_step = 30 * 15
        
        last_saved_frame = None
        current_frame_idx = 0
        saved_count = 0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        print(f"📸 Starting extraction loop. FPS: {fps:.2f}, Frames: {total_frames}, Step: {frame_step}")

        start_time = time.time()
        TIMEOUT_SECONDS = 180  # 3 minutes

        while True:
            # Check Timeout
            if (time.time() - start_time) > TIMEOUT_SECONDS:
                print(f"⚠️ Visual Extraction Timed Out (> {TIMEOUT_SECONDS}s). Returning partial results.")
                break

            # Set position directly using CAP_PROP_POS_FRAMES
            cap.set(cv2.CAP_PROP_POS_FRAMES, current_frame_idx)
            ret, frame = cap.read()
            
            if not ret:
                break
                
            # Duplicate check
            is_duplicate = False
            if last_saved_frame is not None:
                diff_score = get_frame_difference(last_saved_frame, frame)
                # If MSE < 500, it's likely the same slide/content (static)
                # Increased threshold to 500 to filter out minor compression artifacts and slight shifts
                if diff_score < 500: 
                    is_duplicate = True
            
            if not is_duplicate:
                # Save Frame
                timestamp_sec = int(current_frame_idx / fps)
                timestamp_str = f"{timestamp_sec // 60:02d}_{timestamp_sec % 60:02d}"
                filename = f"slide_{timestamp_str}.jpg"
                frame_path = str(session_dir / filename)
                
                # Resize for storage optimization (720p max)
                height, width = frame.shape[:2]
                if width > 1280:
                    scale = 1280 / width
                    frame = cv2.resize(frame, (1280, int(height * scale)))
                
                cv2.imwrite(frame_path, frame)
                last_saved_frame = frame
                saved_count += 1
                
                # Run OCR
                clean_text = ""
                ocr_status = "Skipped"
                try:
                    # Tesseract expects RGB, OpenCV is BGR
                    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    pil_img = Image.fromarray(rgb_frame)
                    # Use --psm 3 (Auto Page Segmentation) for better slide reading
                    text = pytesseract.image_to_string(pil_img, config='--psm 3 --oem 1')
                    clean_text = text.strip()
                    ocr_status = "Success"
                except Exception as e:
                    # If Tesseract fails, we still keep the slide
                    ocr_status = "Failed"
                    error_msg = str(e).lower()
                    if "tesseract is not installed" in error_msg or "not find" in error_msg or "tesseract" in error_msg:
                        # Friendly message: We are still extracting images!
                        if saved_count == 1: 
                            print(f"ℹ️ OCR Text Recognition skipped (Tesseract not found). Visual images will still be saved.")
                    else:
                        print(f"⚠️ OCR Error on {filename}: {e}")
                    # Ensure clean_text is set even on error
                    clean_text = ""

                # Logic update: Keep result if text exists OR if it's a visual keyframe (even with no text)
                # This ensures we get visuals even if OCR fails
                final_text = clean_text if clean_text else f"[Visual Content at {timestamp_str}]"
                
                results.append({
                    "timestamp": f"{timestamp_sec // 60}:{timestamp_sec % 60:02d}",
                    "text": final_text,
                    "path": frame_path,
                    "ocr_status": ocr_status
                })
                print(f"✅ Extracted Slide {saved_count} at {timestamp_str} | Text Len: {len(clean_text)}")
            
            # Advance loop
            current_frame_idx += frame_step
            
            # Safety limit
            if saved_count >= 50:
                print("🛑 Reached max slide limit (50). Stopping.")
                break

        cap.release()
        
        if len(results) == 0:
            print("⚠️ No unique visuals found or video was empty.")
            
        return results

    except cv2.error as e:
        print(f"❌ OpenCV Error during visual extraction: {e}")
        if 'cap' in locals():
            cap.release()
        return []
    except Exception as e:
        print(f"❌ Visual Extraction Fatal Error: {e}")
        import traceback
        traceback.print_exc()
        if 'cap' in locals():
            try:
                cap.release()
            except:
                pass
        return []
