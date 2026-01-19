import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

export async function processUrl(url) {
    console.log('🔗 Processing URL:', url);

    const tempDir = app.getPath('temp');
    const timestamp = Date.now();
    const outputPath = path.join(tempDir, `meeting_download_${timestamp}`);

    return new Promise((resolve, reject) => {
        // First, try to get metadata (title) using -J
        const metaCommand = `yt-dlp -J --flat-playlist "${url}"`;

        exec(metaCommand, (metaError, metaStdout, metaStderr) => {
            let title = "Imported Meeting";
            if (!metaError) {
                try {
                    const metadata = JSON.parse(metaStdout);
                    title = metadata.title || title;
                    console.log('📄 Found title:', title);
                } catch (e) {
                    console.warn('⚠️ Could not parse metadata:', e.message);
                }
            }

            // Now download audio
            const downloadCommand = `yt-dlp -x --audio-format mp3 -o "${outputPath}.%(ext)s" "${url}"`;

            exec(downloadCommand, (error, stdout, stderr) => {
                if (error) {
                    console.error('❌ yt-dlp error:', error);
                    return resolve({
                        success: false,
                        error: 'Failed to process link. Please ensure yt-dlp is installed and the link is valid.'
                    });
                }

                const finalPath = `${outputPath}.mp3`;
                if (fs.existsSync(finalPath)) {
                    console.log('✅ Downloaded successfully:', finalPath);
                    resolve({
                        success: true,
                        path: finalPath,
                        title: title
                    });
                } else {
                    resolve({ success: false, error: 'File downloaded but not found.' });
                }
            });
        });
    });
}
