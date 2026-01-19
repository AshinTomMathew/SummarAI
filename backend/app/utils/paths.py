import os
import sys
from pathlib import Path

def get_binary_paths():
    root_dir = Path(__file__).resolve().parents[3]

    # Default to system-installed binaries
    ffmpeg_cmd = "ffmpeg"
    ffprobe_cmd = "ffprobe"

    if sys.platform == "win32":
        ffmpeg_path = root_dir / "node_modules" / "ffmpeg-static" / "ffmpeg.exe"
        ffprobe_path = root_dir / "node_modules" / "ffprobe-static" / "bin" / "win32" / "x64" / "ffprobe.exe"
    else:
        ffmpeg_path = root_dir / "node_modules" / "ffmpeg-static" / "ffmpeg"
        ffprobe_path = root_dir / "node_modules" / "ffprobe-static" / "bin" / "linux" / "x64" / "ffprobe"

    print(f"DEBUG: root_dir resolved to: {root_dir}")
    print(f"DEBUG: ffmpeg_path: {ffmpeg_path} (Exists: {ffmpeg_path.exists()})")
    print(f"DEBUG: ffprobe_path: {ffprobe_path} (Exists: {ffprobe_path.exists()})")

    if ffmpeg_path.exists():
        ffmpeg_cmd = str(ffmpeg_path)
    if ffprobe_path.exists():
        ffprobe_cmd = str(ffprobe_path)

    print(f"DEBUG: get_binary_paths() returning -> ffmpeg: {ffmpeg_cmd}, ffprobe: {ffprobe_cmd}")
    return ffmpeg_cmd, ffprobe_cmd
