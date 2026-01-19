import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import Tesseract from 'tesseract.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const ffmpegPathRaw = require('ffmpeg-static');
const resolvedFfmpegPath = typeof ffmpegPathRaw === 'string' ? ffmpegPathRaw : (ffmpegPathRaw?.path || ffmpegPathRaw?.default || '');

if (resolvedFfmpegPath) ffmpeg.setFfmpegPath(resolvedFfmpegPath);

export async function extractVisuals(videoPath) {
    const outputDir = path.join(app.getPath('temp'), `visuals_${Date.now()}`);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('🖼️ Extracting visuals from:', videoPath);

    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .on('filenames', function (filenames) {
                console.log('Will generate ' + filenames.join(', '))
            })
            .on('end', async function () {
                console.log('✅ Frames extracted to:', outputDir);
                const results = await processFramesWithOCR(outputDir);
                resolve({ success: true, visuals: results });
            })
            .on('error', function (err) {
                console.log('❌ Error: ' + err.message);
                reject({ success: false, error: err.message });
            })
            .screenshots({
                count: 5, // Extract 5 frames for now, can be adjusted based on duration
                folder: outputDir,
                size: '1280x720',
                filename: 'frame-%i.png'
            });
    });
}

async function processFramesWithOCR(dirPath) {
    const files = fs.readdirSync(dirPath);
    const ocrResults = [];

    for (const file of files) {
        if (file.endsWith('.png')) {
            const filePath = path.join(dirPath, file);
            console.log(`🔍 Running OCR on: ${file}`);
            try {
                const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
                ocrResults.push({
                    frame: file,
                    path: filePath,
                    text: text.trim()
                });
            } catch (err) {
                console.error(`❌ OCR Error for ${file}:`, err);
            }
        }
    }
    return ocrResults;
}
