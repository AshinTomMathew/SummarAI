// import { pipeline, env } from '@xenova/transformers';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import ffmpeg from 'fluent-ffmpeg';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Setup FFmpeg
// Setup FFmpeg
const ffmpegPathRaw = require('ffmpeg-static');
const fixPathForAsar = (path) => path.replace('app.asar', 'app.asar.unpacked');
const resolvedFfmpegPath = fixPathForAsar(typeof ffmpegPathRaw === 'string' ? ffmpegPathRaw : (ffmpegPathRaw?.path || ffmpegPathRaw?.default || ''));
if (resolvedFfmpegPath) ffmpeg.setFfmpegPath(resolvedFfmpegPath);

let transcriber = null;

async function getTranscriber() {
    if (!transcriber) {
        console.log('🔄 Loading local Whisper model...');
        const { pipeline, env } = await import('@xenova/transformers');

        // Configure Xenova to use local models cache
        env.localModelPath = path.join(app.getPath('userData'), 'models');
        env.allowRemoteModels = true;

        transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
        console.log('✅ Whisper model loaded.');
    }
    return transcriber;
}

// Helper to decode audio to Float32Array using FFmpeg
async function decodeAudio(audioPath) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        ffmpeg(audioPath)
            .toFormat('f32le')
            .audioChannels(1)
            .audioFrequency(16000)
            .on('error', (err) => reject(new Error(`FFmpeg error: ${err.message}`)))
            .pipe()
            .on('data', (chunk) => chunks.push(chunk))
            .on('end', () => {
                const buffer = Buffer.concat(chunks);
                // Create Float32Array from buffer
                const float32Data = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4);
                resolve(float32Data);
            });
    });
}

export async function transcribeAudio(audioPath) {
    console.log('🎙️ Local Transcription: Processing', audioPath);

    try {
        const pipe = await getTranscriber();

        if (!fs.existsSync(audioPath)) {
            throw new Error(`File not found: ${audioPath}`);
        }

        console.log('🔄 Decoding audio with FFmpeg...');
        const audioData = await decodeAudio(audioPath);
        console.log('✅ Audio decoded, samples:', audioData.length);

        const result = await pipe(audioData, {
            chunk_length_s: 30,
            stride_length_s: 5,
            language: 'english',
            task: 'transcribe',
            return_timestamps: true
        });

        const transcript = result.text.trim();
        console.log('✅ Local Transcription complete:', transcript.length, 'chars');

        return { success: true, text: transcript };

    } catch (error) {
        console.error('❌ Local Transcription error:', error);
        return { success: false, error: 'Local Whisper Failed: ' + error.message };
    }
}
