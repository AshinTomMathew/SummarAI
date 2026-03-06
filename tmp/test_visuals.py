import sys
import os
from pathlib import Path

# Add backend to path
sys.path.append(os.path.abspath('backend'))

from app.services.visuals import extract_visuals

def test_visuals():
    temp_dir = os.environ.get('TEMP', '')
    video_file = os.path.join(temp_dir, 'SummarAI', 'recordings', 'meeting_live_1772702681957.webm')
    
    print(f"--- TEST START ---")
    print(f"TARGET FILE: {video_file}")
    print(f"EXISTS: {os.path.exists(video_file)}")
    
    if not os.path.exists(video_file):
        print("File does not exist at the expected path.")
        return

    results = extract_visuals(video_file)
    print(f"--- TEST END ---")
    print(f"RESULTS COUNT: {len(results)}")
    for r in results:
        print(f"Frame: {r['timestamp']} -> {r['path']}")

if __name__ == "__main__":
    test_visuals()
