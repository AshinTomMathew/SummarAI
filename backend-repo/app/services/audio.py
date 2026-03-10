import ffmpeg
import os
import tempfile
import shutil
from pathlib import Path
from app.utils.paths import get_binary_paths

FFMPEG_CMD, FFPROBE_CMD = get_binary_paths()

def normalize_audio(input_path: str) -> str:
    """
    ULTRA-FAST: Converts media to a highly compressed 16kHz MONO MP3 for processing.
    Now targets MP3 directly for speed and storage efficiency.
    """
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Media Prep Failed: Input file not found: {input_path}")

    # Use a persistent session folder for the output if possible, otherwise temp
    fd, output_path = tempfile.mkstemp(suffix=".mp3")
    os.close(fd) 

    abs_input = os.path.abspath(input_path)
    abs_output = os.path.abspath(output_path)

    try:
        # Optimization: 16k sample rate, mono, low bitrate (24k), fast encoder settings
        (
            ffmpeg
            .input(abs_input)
            .output(abs_output, 
                    acodec='libmp3lame', 
                    ac=1, 
                    ar='16k', 
                    audio_bitrate='24k',
                    preset='ultrafast')
            .overwrite_output()
            .run(cmd=FFMPEG_CMD, capture_stdout=True, capture_stderr=True)
        )
        return abs_output
    except ffmpeg.Error as e:
        if os.path.exists(abs_output):
            os.remove(abs_output)
        error_msg = e.stderr.decode() if e.stderr else str(e)
        raise RuntimeError(f"Media Prep Failed: FFmpeg error: {error_msg}")

def compress_audio(input_path: str, output_path: str) -> bool:
    """
    EXTREME COMPRESSION: Reduces file size to minimum (16k-24k MP3) for long-term storage.
    """
    if not os.path.exists(input_path):
        return False
        
    try:
        # If the input is already low bitrate, just copy it to save time
        (
            ffmpeg
            .input(input_path)
            .output(output_path, 
                    audio_bitrate='24k', 
                    acodec='libmp3lame', 
                    ac=1,
                    preset='ultrafast')
            .overwrite_output()
            .run(cmd=FFMPEG_CMD, capture_stdout=True, capture_stderr=True)
        )
        return True
    except Exception as e:
        print(f"❌ Compression Error: {e}")
        return False

def get_duration(input_path: str) -> float:
    """
    Returns the duration of a media file in seconds.
    Tries ffprobe first, then falls back to cv2.
    """
    try:
        probe = ffmpeg.probe(input_path, cmd=FFPROBE_CMD)
        return float(probe['format']['duration'])
    except Exception as e:
        print(f"⚠️ ffprobe duration failed: {e}. Trying cv2 fallback...")
        try:
            import cv2
            cap = cv2.VideoCapture(input_path)
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = frame_count / fps if fps > 0 else 0.0
            cap.release()
            return float(duration)
        except Exception as cv_e:
            print(f"❌ cv2 duration fallback failed: {cv_e}")
            return 0.0
