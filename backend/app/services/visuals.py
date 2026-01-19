import ffmpeg
import os
import tempfile
from pathlib import Path
import pytesseract
from PIL import Image
from typing import List, Dict
from app.utils.paths import get_binary_paths

FFMPEG_CMD, _ = get_binary_paths()

def extract_visuals(video_path: str) -> List[Dict]:
    """
    SPEED OPTIMIZED: Extracts keyframes and performs fast OCR.
    Reduces storage by using lower quality JPEGs and slower extraction intervals.
    """
    abs_video_path = os.path.abspath(video_path)
    if not os.path.exists(abs_video_path):
        return []

    visuals_dir = Path(tempfile.gettempdir()) / "SummarAI" / "visuals"
    visuals_dir.mkdir(parents=True, exist_ok=True)
    
    session_id = f"vid_{int(os.path.getmtime(abs_video_path))}_{os.path.basename(abs_video_path)}"
    session_dir = visuals_dir / session_id
    session_dir.mkdir(parents=True, exist_ok=True)

    try:
        # SPEED: Extract one frame every 60 seconds instead of 30
        # SIZE: Use qscale=5 (lower quality, smaller file) and scale down for speed
        output_pattern = str(session_dir / "frame_%03d.jpg")
        (
            ffmpeg
            .input(abs_video_path)
            .filter('fps', fps=1/60)
            .filter('scale', 854, -1) # Resize to 480p equivalent for faster OCR and low size
            .output(output_pattern, qscale=5)
            .run(cmd=FFMPEG_CMD, capture_stdout=True, capture_stderr=True, overwrite_output=True)
        )
        
        results = []
        # Sort to keep timeline order
        frames = sorted([f for f in os.listdir(session_dir) if f.endswith(".jpg")])
        
        # Limit to first 20 frames to avoid bloating for very long videos
        for filename in frames[:20]:
            frame_path = str(session_dir / filename)
            
            # OCR with limited config for speed
            try:
                img = Image.open(frame_path).convert('L') # Convert to grayscale for faster OCR
                text = pytesseract.image_to_string(img, config='--psm 3 --oem 1')
            except Exception:
                text = ""
            
            results.append({
                "timestamp": filename.replace('frame_', '').replace('.jpg', ''),
                "text": text.strip() if len(text.strip()) > 5 else "", # Ignore noise
                "path": frame_path
            })
            
        return results
    except Exception as e:
        print(f"❌ Visual Extraction Speed Error: {e}")
        return []
