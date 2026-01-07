import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

export async function extractVisuals(videoPath) {
    console.log('🖼️ Extracting visuals from:', videoPath);
    const outputDir = path.join(app.getPath('userData'), 'visuals');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // In a real scenario, we'd use complex filters to detect scene changes or slides
    // For now, extract a frame every 60 seconds
    const pattern = path.join(outputDir, 'frame_%04d.png');

    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .on('end', () => {
                console.log('Visual extraction finished');
                // Read the directory to get the files
                fs.readdir(outputDir, (err, files) => {
                    if (err) resolve({ success: true, frames: [] }); // Fallback
                    const framePaths = files
                        .filter(f => f.startsWith('frame_') && f.endsWith('.png'))
                        .map(f => path.join(outputDir, f));
                    resolve({ success: true, frames: framePaths });
                });
            })
            .on('error', (err) => {
                console.error('Error extracting visuals:', err);
                reject({ success: false, error: err.message });
            })
            .outputOptions(['-vf fps=1/60']) // Extract 1 frame every 60 seconds
            .save(pattern);
    });
}
