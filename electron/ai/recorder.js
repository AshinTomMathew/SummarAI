import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Force strings and fix asar path
const fixPathForAsar = (path) => {
    return path.replace('app.asar', 'app.asar.unpacked');
};

const ffmpegPathRaw = require('ffmpeg-static');
const ffprobePathRaw = require('ffprobe-static');

const resolvedFfmpegPath = fixPathForAsar(typeof ffmpegPathRaw === 'string' ? ffmpegPathRaw : (ffmpegPathRaw?.path || ffmpegPathRaw?.default || ''));
const resolvedFfprobePath = fixPathForAsar(typeof ffprobePathRaw === 'string' ? ffprobePathRaw : (ffprobePathRaw?.path || ffprobePathRaw?.default || ''));

if (resolvedFfmpegPath) ffmpeg.setFfmpegPath(resolvedFfmpegPath);
if (resolvedFfprobePath) ffmpeg.setFfprobePath(resolvedFfprobePath);

export async function processAudio(inputPath) {
    const outputPath = path.join(app.getPath('temp'), `processed_${Date.now()}.mp3`);

    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .toFormat('mp3')
            .audioChannels(1)
            .audioFrequency(16000)
            .on('end', () => {
                resolve({ success: true, path: outputPath });
            })
            .on('error', (err) => {
                console.error('❌ Error processing audio:', err);
                reject({ success: false, error: err.message });
            })
            .save(outputPath);
    });
}

export async function extractAudioFromVideo(videoPath) {
    const audioPath = path.join(app.getPath('temp'), `extracted_${Date.now()}.mp3`);

    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .noVideo()
            .audioCodec('libmp3lame')
            .on('end', () => {
                resolve({ success: true, path: audioPath });
            })
            .on('error', (err) => {
                console.error('❌ Error extracting audio:', err);
                reject({ success: false, error: err.message });
            })
            .save(audioPath);
    });
}

export async function getDuration(filePath) {
    return new Promise((resolve) => {
        try {
            ffmpeg.ffprobe(filePath, (err, metadata) => {
                if (err) {
                    console.warn('⚠️ ffprobe error:', err.message);
                    return resolve(0);
                }
                resolve(Math.round(metadata.format.duration || 0));
            });
        } catch (err) {
            console.error('❌ ffprobe crashed:', err);
            resolve(0);
        }
    });
}

export async function startCapturing() {
    // This is typically handled in the renderer via navigator.mediaDevices.getDisplayMedia
    return { success: true, message: 'Capturing setup' };
}
