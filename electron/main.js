import { app, BrowserWindow, ipcMain, protocol, shell, net, desktopCapturer, session, screen } from 'electron';
import { pathToFileURL, fileURLToPath } from 'url';

// Register privileged schemes strictly before app.whenReady()
protocol.registerSchemesAsPrivileged([
    { scheme: 'media', privileges: { secure: true, standard: true, stream: true, bypassCSP: true, supportFetchAPI: true } }
]);
import { spawn } from 'child_process';
import path from 'path';
import bcrypt from 'bcryptjs';
import { initDatabase, query as dbQuery } from './database.js';
import { generateSummary, classifyContent } from './ai/summarizer.js';
import { createPDFReport, createDocxReport } from './ai/export.js';
import { googleSignIn } from './auth.js';
import dotenv from 'dotenv';
import { transcribeAudio } from './ai/transcriber.js';
import { extractVisuals } from './ai/visuals.js';
import { chatQuery } from './ai/chatbot.js';
import { processAudio, extractAudioFromVideo, getDuration } from './ai/recorder.js';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';

// Define __dirname and __filename for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PYTHON_API_BASE = 'http://127.0.0.1:1001';

console.log('🔵 main.js: Starting Electron...');

// Load environment variables
const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
console.log('🔵 App is Packaged:', app.isPackaged);
console.log('🔵 isDev:', isDev);

// Resolve .env path
let envPath;
if (isDev) {
    envPath = path.join(__dirname, '../.env');
} else {
    // When packaged, check next to the exe or in resources
    const exePath = path.dirname(app.getPath('exe'));
    const internalEnvPath = path.join(process.resourcesPath, '.env');
    const externalEnvPath = path.join(exePath, '.env');

    if (fs.existsSync(externalEnvPath)) {
        envPath = externalEnvPath;
    } else {
        envPath = internalEnvPath;
    }
}

console.log('🔵 Loading .env from:', envPath);
dotenv.config({ path: envPath });

console.log('🔵 NODE_ENV (assumed):', isDev ? 'development' : 'production');
console.log('🔵 app.isPackaged:', app.isPackaged);
console.log('🔵 GOOGLE_CLIENT_ID exists:', !!process.env.GOOGLE_CLIENT_ID);

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

// IPC Handler for Chat History
ipcMain.handle('db-get-chat-history', async (event, { sessionId, userId }) => {
    try {
        if (!sessionId || !userId) return { success: true, history: [] };
        console.log(`📜 Fetching chat history for session ${sessionId} (User ${userId})`);

        const history = await dbQuery(
            'SELECT `urole` as sender, `umessage` as text, `created_at` FROM `chat_history` WHERE `session_id` = ? AND `user_id` = ? ORDER BY `created_at` ASC',
            [sessionId, userId]
        );

        return {
            success: true,
            history: history.map(h => ({
                sender: h.sender === 'assistant' ? 'ai' : h.sender,
                text: h.text,
                timestamp: h.created_at
            }))
        };
    } catch (error) {
        console.error('❌ Failed to fetch chat history:', error);
        return { success: false, error: error.message };
    }
});

let mainWindow;
let activeUserId = null; // Track currently logged in user

function getSessionFilePath() {
    return path.join(app.getPath('userData'), 'session.json');
}

function saveSessionState(userId) {
    try {
        fs.writeFileSync(getSessionFilePath(), JSON.stringify({ activeUserId: userId }));
    } catch (e) {
        console.error('Failed to save session state:', e);
    }
}

function loadSessionState() {
    try {
        const p = getSessionFilePath();
        if (fs.existsSync(p)) {
            const data = JSON.parse(fs.readFileSync(p));
            return data.activeUserId || null;
        }
    } catch (e) {
        console.error('Failed to load session state:', e);
    }
    return null;
}

let pyProcess = null; // Track backend process globaly
let isBackendReady = false; // Flag to track backend health
let isSpawning = false; // Flag to prevent multiple spawn attempts

async function checkBackendHealth(retries = 60, interval = 1000) {
    const healthUrl = `${PYTHON_API_BASE}/health`;
    console.log(`🔍 Checking backend health at ${healthUrl}...`);

    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(healthUrl);
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'online') {
                    console.log('✅ Backend is ONLINE and ready.');
                    isBackendReady = true;
                    return true;
                }
            }
        } catch (error) {
            // Ignore errors during polling
        }
        console.log(`⏳ Backend not ready yet, retrying (${i + 1}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, interval));
    }

    console.error('❌ Backend health check TIMEOUT.');
    return false;
}

// Helper to spawn Python Backend
let backendSpawned = false; // Strict guard to prevent double-spawn

let respawnAttempts = 0;
const MAX_RESPAWNS = 999; // Essentially infinite for a watchdog behavior

async function spawnPythonBackend() {
    if (pyProcess) {
        console.log('🐍 Backend is already running.');
        return;
    }

    // Check health before spawning to avoid port conflicts
    const isRunning = await checkBackendHealth(1, 100);
    if (isRunning) {
        console.log('✅ Backend found already active (possibly manual start). Monitoring only.');
        isBackendReady = true;
        backendSpawned = true;
        return;
    }

    backendSpawned = true;
    const attempt = respawnAttempts + 1;
    console.log(`🚀 [WATCHDOG] Spawning Python Backend (Attempt ${attempt})...`);

    let pyPath;
    let cwd;
    let args;

    if (app.isPackaged) {
        pyPath = path.join(process.resourcesPath, 'bin/main.exe');
        cwd = path.join(process.resourcesPath, 'bin');
        args = [];
    } else {
        pyPath = 'python';
        cwd = path.join(__dirname, '../backend');
        args = ['-u', 'main.py'];
    }

    if (app.isPackaged ? fs.existsSync(pyPath) : true) {
        isSpawning = true;

        const env = { ...process.env };
        const rootPath = path.join(__dirname, '..');
        const ffmpegDir = path.join(rootPath, 'node_modules', 'ffmpeg-static');
        const ffprobeDir = path.join(rootPath, 'node_modules', 'ffprobe-static', 'bin', process.platform === 'win32' ? 'win32' : 'linux', 'x64');

        const pathKey = process.platform === 'win32' ? 'Path' : 'PATH';
        const existingPath = env[pathKey] || '';
        env[pathKey] = `${ffmpegDir}${path.delimiter}${ffprobeDir}${path.delimiter}${existingPath}`;

        pyProcess = spawn(pyPath, args, {
            cwd: cwd,
            detached: false,
            env: env,
            stdio: 'pipe'
        });

        pyProcess.stdout.on('data', (data) => console.log(`🐍 Backend: ${data}`));
        pyProcess.stderr.on('data', (data) => console.error(`🐍 Backend Error: ${data}`));

        pyProcess.on('error', (err) => {
            console.error('❌ Watchdog: Failed to start Python Backend:', err);
            isSpawning = false;
            backendSpawned = false;
        });

        pyProcess.on('exit', (code) => {
            console.log(`⚠️ Watchdog: Backend exited with code ${code}`);
            pyProcess = null;
            isBackendReady = false;
            isSpawning = false;
            backendSpawned = false;

            // AUTO-RESTART LOOP (WATCHDOG MODE)
            // If it exit with non-zero (crash), restart. If it exits with 0 (clean), still restart if it was unexpected.
            const delay = Math.min(respawnAttempts * 2000 + 1000, 10000); // Backoff up to 10s
            respawnAttempts++;

            console.log(`🔄 [WATCHDOG] Restarting backend in ${delay / 1000}s...`);
            setTimeout(() => {
                spawnPythonBackend();
            }, delay);
        });

        pyProcess.unref();

        app.on('will-quit', () => {
            if (pyProcess) {
                console.log('🛑 Watchdog: Cleaning up backend...');
                pyProcess.kill();
                pyProcess = null;
            }
        });
    } else {
        console.error('❌ Watchdog: Python Backend binary not found at:', pyPath);
        isSpawning = false;
        backendSpawned = false;
    }
}

async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs'),
        },
        backgroundColor: '#142210',
        titleBarStyle: 'default',
        icon: path.join(__dirname, '../public/icon.png'),
    });

    // Content Security Policy
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self' 'unsafe-inline' 'unsafe-eval' media: data: blob: https://lh3.googleusercontent.com https://www.gstatic.com https://generativelanguage.googleapis.com; " +
                    "img-src 'self' media: data: blob: https://lh3.googleusercontent.com https://www.gstatic.com; " +
                    "media-src 'self' media: data: blob:; " +
                    "connect-src 'self' http://127.0.0.1:1001 http://localhost:1001 http://localhost:5173; " +
                    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                    "font-src 'self' data: https://fonts.gstatic.com;"
                ]
            }
        });
    });

    // Handle permissions
    mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        const allowedPermissions = ['media', 'audioCapture', 'videoCapture', 'display-capture', 'notifications'];
        if (allowedPermissions.includes(permission)) {
            callback(true);
        } else {
            console.log(`🔒 Permission requested and denied: ${permission}`);
            callback(false);
        }
    });

    // Handle session-wide permissions (Alternative check for some Electron versions)
    mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission, originatingOrigin, details) => {
        return ['media', 'audioCapture', 'videoCapture', 'display-capture'].includes(permission);
    });

    // Initialize database
    const dbStatus = await initDatabase();
    if (!dbStatus.success) {
        console.error('Database initialization failed:', dbStatus.error);
    }

    // Load the app
    if (isDev) {
        const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
        console.log('🔵 Loading URL:', devUrl);
        mainWindow.loadURL(devUrl);
        // mainWindow.webContents.openDevTools();
    } else {
        const indexPath = path.join(__dirname, '../dist/index.html');
        console.log('🔵 Loading File:', indexPath);
        if (fs.existsSync(indexPath)) {
            mainWindow.loadFile(indexPath);
        } else {
            console.error('❌ index.html not found at:', indexPath);
        }
    }

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('❌ Failed to load:', errorCode, errorDescription);
    });

    mainWindow.on('ready-to-show', () => {
        console.log('🔵 Window ready to show');
        mainWindow.show();
    });

    mainWindow.webContents.on('render-process-gone', (event, details) => {
        console.error('❌ Render process gone:', details);
    });

    mainWindow.webContents.on('unresponsive', () => {
        console.log('❌ WebContents unresponsive');
    });

    mainWindow.on('closed', () => {
        console.log('🔵 Window closed event triggered');
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    // Setup desktop capture for navigator.mediaDevices.getDisplayMedia
    session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
        desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
            // Pick the first available screen
            callback({ video: sources[0], audio: 'loopback' });
        }).catch(err => {
            console.error('getSources error:', err);
            callback({ video: null, audio: null });
        });
    });

    protocol.handle('media', async (request) => {
        try {
            // Safe path extraction using URL params to bypass Chromium's host-parsing quirks
            let filePath = "";
            try {
                const urlObj = new URL(request.url);
                if (urlObj.searchParams.has('path')) {
                    filePath = urlObj.searchParams.get('path');
                } else {
                    let rawPath = request.url.replace(/^media:\/\/(local\/)?/i, '');
                    filePath = decodeURIComponent(rawPath);
                }
            } catch (e) {
                let rawPath = request.url.replace(/^media:\/\/(local\/)?/i, '');
                filePath = decodeURIComponent(rawPath);
            }

            // Remove leading slashes if they exist before drive letter (e.g. /C:/path -> C:/path)
            if (process.platform === 'win32') {
                if (filePath.startsWith('/')) {
                    filePath = filePath.substring(1);
                }
                // Standardize to backslashes for fs.readFileSync
                filePath = path.normalize(filePath);
            }

            if (isDev) {
                console.log(`📂 Media Protocol: [${request.url}] -> [${filePath}]`);
            }

            if (!fs.existsSync(filePath)) {
                console.error(`❌ Media Protocol: File NOT FOUND at: "${filePath}"`);
                return new Response('File not found', { status: 404 });
            }

            const ext = path.extname(filePath).toLowerCase();
            const mimeTypes = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.mp3': 'audio/mpeg',
                '.mp4': 'video/mp4',
                '.webm': 'video/webm'
            };
            const contentType = mimeTypes[ext] || 'application/octet-stream';

            try {
                const data = fs.readFileSync(filePath);
                return new Response(data, {
                    status: 200,
                    headers: {
                        'Content-Type': contentType,
                        'Access-Control-Allow-Origin': '*',
                        'Cache-Control': 'no-cache',
                        'Content-Length': data.length.toString()
                    }
                });
            } catch (readErr) {
                console.error(`❌ Media Protocol Read Error: ${readErr.message}`);
                // Fallback attempt using net.fetch with file://
                try {
                    const fileUrl = pathToFileURL(filePath).toString();
                    const response = await net.fetch(fileUrl);
                    return new Response(response.body, {
                        status: response.status,
                        headers: {
                            'Content-Type': contentType,
                            'Access-Control-Allow-Origin': '*'
                        }
                    });
                } catch (netErr) {
                    console.error(`❌ Media Protocol Fallback Failed: ${netErr.message}`);
                    return new Response('Read Error', { status: 500 });
                }
            }
        } catch (error) {
            console.error('❌ Media Protocol Fatal Exception:', error);
            return new Response('Internal Protocol Error', { status: 500 });
        }
    });

    // Load persisted session
    activeUserId = loadSessionState();
    console.log('🔵 Loaded session state. Active User ID:', activeUserId);

    createWindow();
    spawnPythonBackend();
    checkBackendHealth(); // Start health polling in background

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    console.log('🔵 All windows closed');
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    console.log('🔵 App is about to quit');
});

app.on('quit', (event, exitCode) => {
    console.log('🔵 App quit with code:', exitCode);
});

// IPC Handlers
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

// Session Management Handlers
ipcMain.handle('auth-set-session', (event, userId) => {
    console.log(`🔵 Session set for User ID: ${userId}`);
    activeUserId = userId;
    saveSessionState(userId);
    return { success: true };
});

ipcMain.handle('auth-get-session-user', async () => {
    if (!activeUserId) {
        return { success: false, error: 'No active session' };
    }
    try {
        const users = await dbQuery('SELECT `id`, `uname`, `email` FROM `users` WHERE `id` = ?', [activeUserId]);
        if (users.length === 0) {
            return { success: false, error: 'User not found' };
        }
        return { success: true, user: { ...users[0], name: users[0].uname } };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('auth-logout', () => {
    console.log(`🔵 Logging out User ID: ${activeUserId}`);
    activeUserId = null;
    saveSessionState(null);
    return { success: true };
});

ipcMain.handle('auth-get-active-id', () => {
    console.log(`🔵 IPC: getActiveId called, returning: ${activeUserId}`);
    return activeUserId;
});

// AI Module Imports
// AI Module imports already at top

// ... existing imports ...

// AI Module Handlers
ipcMain.handle('start-recording', async () => {
    // In a real app, this might trigger a specific ffmpeg stream or UI state
    return { success: true, message: 'Recording started' };
});

// -- Toolbar & Overlay System --
let toolbarWindow = null;
let drawingWindow = null;

ipcMain.handle('show-toolbar', () => {
    if (toolbarWindow) return;
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width } = primaryDisplay.workAreaSize;

    toolbarWindow = new BrowserWindow({
        width: 300,
        height: 50,
        x: Math.round((width / 2) - 150),
        y: 20,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        hasShadow: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs'),
        }
    });

    toolbarWindow.setAlwaysOnTop(true, "screen-saver");
    toolbarWindow.setMenu(null);

    if (isDev) {
        toolbarWindow.loadURL('http://localhost:5173/#/toolbar');
    } else {
        toolbarWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'toolbar' });
    }
});

ipcMain.handle('hide-toolbar', () => {
    if (toolbarWindow) {
        toolbarWindow.close();
        toolbarWindow = null;
    }
});

ipcMain.handle('take-screenshot', async () => {
    console.log("📸 Taking screenshot...");
    try {
        if (toolbarWindow) toolbarWindow.hide();
        // Give time for UI to hide
        await new Promise(r => setTimeout(r, 100));

        const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } });
        if (toolbarWindow) toolbarWindow.showInactive();

        if (sources.length > 0) {
            const buffer = sources[0].thumbnail.toPNG();
            const filePath = path.join(os.homedir(), 'Desktop', `SummarAI_Snap_${crypto.randomBytes(3).toString('hex')}.png`);
            fs.writeFileSync(filePath, buffer);
            console.log("✅ Screenshot saved:", filePath);
            return { success: true, path: filePath };
        }
        return { success: false, error: "No screen found" };
    } catch (err) {
        if (toolbarWindow) toolbarWindow.showInactive();
        return { success: false, error: err.message };
    }
});

ipcMain.handle('trigger-stop-recording-sender', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('trigger-stop-recording');
    }
});

ipcMain.handle('trigger-pause-recording-sender', (event, isPaused) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('trigger-pause-recording', isPaused);
    }
});

ipcMain.handle('show-drawing-overlay', () => {
    if (drawingWindow) return;
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size; // full screen including taskbars etc for drawing

    drawingWindow = new BrowserWindow({
        x: 0,
        y: 0,
        width,
        height,
        transparent: true,
        frame: false,
        alwaysOnTop: true, // Needs to be above everything except toolbar
        skipTaskbar: true,
        resizable: false,
        hasShadow: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs'),
        }
    });

    // Force toolbar higher
    if (toolbarWindow) {
        toolbarWindow.setAlwaysOnTop(true, "screen-saver");
    }

    drawingWindow.setMenu(null);
    if (isDev) {
        drawingWindow.loadURL('http://localhost:5173/#/drawing');
    } else {
        drawingWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'drawing' });
    }

    return { success: true };
});

ipcMain.handle('hide-drawing-overlay', () => {
    if (drawingWindow) {
        drawingWindow.close();
        drawingWindow = null;
    }
    return { success: true };
});

async function waitForBackendReady(maxWaitMs = 30000) {
    if (isBackendReady) return true;

    console.log('⏳ Waiting for backend to become ready...');
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
        if (isBackendReady) return true;
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    throw new Error('Backend startup timed out.');
}

async function callPythonAPI(endpoint, data = {}, isFormData = true) {
    try {
        // Ensure backend is ready before proceeding
        await waitForBackendReady();

        let options = { method: 'POST' };
        if (isFormData) {
            const formData = new URLSearchParams();
            for (let key in data) formData.append(key, data[key]);
            options.body = formData;
            options.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
        } else {
            options.body = JSON.stringify(data);
            options.headers = { 'Content-Type': 'application/json' };
        }

        const url = `${PYTHON_API_BASE}${endpoint}`;
        console.log(`🌐 Fetching Python API: ${url}`);
        const response = await fetch(url, options);
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Backend response error: ${response.status} - ${text}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`❌ Python API Error (${endpoint}):`, error);
        return { success: false, error: `AI Backend Error: ${error.message}` };
    }
}

ipcMain.handle('upload-file', async (event, filePath) => {
    console.log('🔵 IPC: [BRIDGE] upload-file');
    try {
        let validPath = '';
        if (typeof filePath === 'string') validPath = filePath;
        else if (filePath && typeof filePath === 'object') validPath = filePath.path || filePath.absolutePath || '';

        if (!validPath) return { success: false, error: 'Invalid file path.' };

        // Call Python for normalization & duration
        return await callPythonAPI('/audio/normalize', { path: validPath });
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('transcribe-audio', async (event, audioPath) => {
    console.log('🎙️ IPC: [BRIDGE] transcribe-audio');
    return await callPythonAPI('/audio/transcribe', { path: audioPath });
});

ipcMain.handle('classify-content', async (event, transcript) => {
    console.log('🏷️ IPC: [BRIDGE] classify-content');
    return await callPythonAPI('/analysis/classify', { text: transcript });
});

ipcMain.handle('generate-summary', async (event, { transcript, category }) => {
    console.log('📝 IPC: [BRIDGE] generate-summary');
    return await callPythonAPI('/analysis/summarize', { text: transcript, category: category });
});

ipcMain.handle('analyze-content', async (event, transcript) => {
    console.log('🧠 IPC: [BRIDGE] analyze-content (Unified)');
    return await callPythonAPI('/analysis/analyze', { text: transcript });
});

ipcMain.handle('transform-content', async (event, { text, format }) => {
    console.log('✨ IPC: [BRIDGE] transform-content');
    return await callPythonAPI('/analysis/transform', { text: text, format_type: format });
});

ipcMain.handle('extract-visuals', async (event, videoPath) => {
    console.log('🖼️ IPC: [BRIDGE] extract-visuals');
    return await callPythonAPI('/analysis/extract-visuals', { path: videoPath });
});

ipcMain.handle('generate-brain-teaser', async (event, transcript) => {
    const { generateBrainTeaser } = await import('./ai/summarizer.js');
    return await generateBrainTeaser(transcript);
});

ipcMain.handle('chat-query', async (event, { query: userQuery, userId, sessionId, transcript: providedTranscript, summary: providedSummary, visuals: providedVisuals }) => {
    console.log('💬 IPC: [BRIDGE] chat-query -> Python');
    try {
        // 1. Logger: Save User Message to History
        if (userId && sessionId) {
            try {
                await dbQuery(
                    'INSERT INTO `chat_history` (`user_id`, `session_id`, `urole`, `umessage`) VALUES (?, ?, ?, ?)',
                    [userId, sessionId, 'user', userQuery]
                );
            } catch (dbErr) { console.error('❌ DB Log Error (User):', dbErr); }
        }

        // 2. Call Python Backend for AI Logic
        // Encode visuals to JSON string if it's an object/array
        const visualsStr = typeof providedVisuals === 'object' ? JSON.stringify(providedVisuals) : (providedVisuals || "");

        const result = await callPythonAPI('/chat/query', {
            query: userQuery,
            transcript: providedTranscript || "",
            summary: providedSummary || "",
            visuals: visualsStr
        });

        // POLYFILL: Handle legacy backend response (answer vs response)
        if (result.success && result.answer && !result.response) {
            console.log('⚠️ [COMPAT] Mapping result.answer to result.response');
            result.response = result.answer;
        }

        // 3. Logger: Save AI Response to History
        if (result.success && userId && sessionId) {
            try {
                const aiMsg = result.response || null;
                console.log(`🤖 Logging AI Response. User: ${userId}, Session: ${sessionId}, Msg: ${aiMsg ? 'EXISTS' : 'NULL'}`);
                await dbQuery(
                    'INSERT INTO `chat_history` (`user_id`, `session_id`, `urole`, `umessage`) VALUES (?, ?, ?, ?)',
                    [userId, sessionId, 'assistant', aiMsg]
                );
            } catch (dbErr) { console.error('❌ DB Log Error (AI):', dbErr); }
        }

        return result;
    } catch (error) {
        console.error('❌ Chat IPC Error:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('process-link', async (event, url) => {
    console.log('🔗 IPC: [BRIDGE] process-link');
    return await callPythonAPI('/audio/process-link', { url: url });
});

ipcMain.handle('compress-media', async (event, filePath) => {
    console.log('📉 IPC: [BRIDGE] compress-media');
    return await callPythonAPI('/audio/compress', { path: filePath });
});

ipcMain.handle('save-temp-audio', async (event, buffer) => {
    try {
        const tempPath = path.join(app.getPath('temp'), `meeting_live_${Date.now()}.webm`);
        fs.writeFileSync(tempPath, Buffer.from(buffer));
        console.log('🔵 Live recording saved to temp:', tempPath);
        return { success: true, path: tempPath, absolutePath: path.resolve(tempPath) };
    } catch (error) {
        console.error('❌ Failed to save temp audio:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('ensure-recording-dir', async () => {
    try {
        const storageDir = path.join(app.getPath('temp'), 'SummarAI', 'recordings');
        if (!fs.existsSync(storageDir)) {
            fs.mkdirSync(storageDir, { recursive: true });
        }
        return { success: true, path: storageDir };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('persist-recording', async (event, tempPath) => {
    try {
        const storageDir = path.join(app.getPath('temp'), 'SummarAI', 'recordings');
        if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

        const filename = path.basename(tempPath);
        const destPath = path.join(storageDir, filename);

        fs.copyFileSync(tempPath, destPath);
        console.log(`🔵 File persisted to temp storage: ${destPath}`);

        return { success: true, path: destPath };
    } catch (error) {
        console.error('❌ Failed to persist recording:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('export-report', async (event, { sessionData, format }) => {
    try {
        console.log(`📄 Exporting report as ${format.toUpperCase()}...`);
        const result = await callPythonAPI('/export', {
            format: format,
            title: sessionData.title,
            summary: sessionData.summary,
            transcript: sessionData.transcript,
            visuals: JSON.stringify(sessionData.visuals || [])
        });

        if (result.success && result.path) {
            shell.showItemInFolder(result.path);
            return { success: true, path: result.path };
        } else {
            return { success: false, error: result.error || "Export failed" };
        }
    } catch (error) {
        console.error('❌ Export IPC Error:', error);
        return { success: false, error: error.message };
    }
});

// Database & Authentication Handlers
ipcMain.handle('db-login', async (event, { email, password }) => {
    try {
        const users = await dbQuery('SELECT * FROM `users` WHERE `email` = ?', [email]);
        if (users.length === 0) {
            return { success: false, error: 'User not found' };
        }

        const user = users[0];
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return { success: false, error: 'Invalid password' };
        }

        activeUserId = user.id; // Set session immediately
        saveSessionState(activeUserId);
        console.log(`🔵 Login successful for: ${user.email}, activeUserId: ${activeUserId}`);

        return {
            success: true,
            user: { id: user.id, name: user.uname, email: user.email }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-register', async (event, { name, email, password }) => {
    try {
        // Check if user exists
        const existingUsers = await dbQuery('SELECT * FROM `users` WHERE `email` = ?', [email]);
        if (existingUsers.length > 0) {
            return { success: false, error: 'Email already registered' };
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insert user
        const result = await dbQuery(
            'INSERT INTO `users` (`uname`, `email`, `password_hash`) VALUES (?, ?, ?)',
            [name, email, passwordHash]
        );

        return {
            success: true,
            user: { id: result.insertId, name, email }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-forgot-password', async (event, email) => {
    try {
        const users = await dbQuery('SELECT * FROM `users` WHERE `email` = ?', [email]);
        if (users.length === 0) {
            return { success: false, error: 'User not found' };
        }
        return { success: true, message: 'If an account exists with this email, a password reset link has been sent.' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

function setStatus(msg) {
    if (mainWindow) {
        mainWindow.webContents.send('app-status-update', msg);
    }
}

ipcMain.handle('db-save-session', async (event, sessionData) => {
    try {
        const { userId, title, date, duration, transcript, summary, classification, visuals, source_type, source_path } = sessionData;
        console.log(`💾 Saving session for user ${userId}: ${title}`);

        // Format date for MySQL DATETIME (YYYY-MM-DD HH:MM:SS)
        const formattedDate = new Date(date || Date.now()).toISOString().slice(0, 19).replace('T', ' ');

        const result = await dbQuery(
            'INSERT INTO `sessions` (`user_id`, `title`, `udate`, `duration`, `transcript`, `summary`, `classification`, `visuals`, `source_type`, `source_path`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                userId || null,
                title || 'Untitled Session',
                formattedDate,
                duration || 0,
                transcript || '',
                summary || '',
                classification || 'General',
                JSON.stringify(visuals || []),
                source_type || 'upload',
                source_path || ''
            ]
        );
        console.log('✅ Session saved with ID:', result.insertId);
        return { success: true, sessionId: result.insertId };
    } catch (error) {
        console.error('❌ Failed to save session:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-update-visuals', async (event, { sessionId, visuals }) => {
    try {
        console.log(`💾 Updating visuals for session ${sessionId}...`);
        const visualsStr = JSON.stringify(visuals || []);
        await dbQuery('UPDATE `sessions` SET `visuals` = ? WHERE `id` = ?', [visualsStr, sessionId]);
        console.log('✅ Visuals updated successfully.');
        return { success: true };
    } catch (error) {
        console.error('❌ Failed to update visuals in DB:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-delete-session', async (event, sessionId) => {
    try {
        console.log(`🗑️ Deleting session ${sessionId}...`);
        // Use a transaction or multiple queries if you need to delete chat history too
        await dbQuery('DELETE FROM `chat_history` WHERE `session_id` = ?', [sessionId]);
        await dbQuery('DELETE FROM `sessions` WHERE `id` = ?', [sessionId]);
        console.log('✅ Session and its chat history deleted successfully.');
        return { success: true };
    } catch (error) {
        console.error('❌ Failed to delete session:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-get-sessions', async (event, userId) => {
    try {
        // GUEST USER: Return empty list (No History)
        if (!userId) {
            console.log('🔵 Guest user requesting sessions - returning empty.');
            return { success: true, sessions: [] };
        }

        let query = 'SELECT * FROM `sessions` WHERE `user_id` = ? ORDER BY `udate` DESC';
        let params = [userId];


        const sessions = await dbQuery(query, params);
        return {
            success: true,
            sessions: sessions.map(s => ({
                ...s,
                date: s.udate,
                visuals: typeof s.visuals === 'string' ? JSON.parse(s.visuals) : s.visuals
            }))
        };
    } catch (error) {
        console.error('❌ Failed to fetch sessions:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-get-user', async (event, userId) => {
    try {
        const users = await dbQuery('SELECT `id`, `uname`, `email` FROM `users` WHERE `id` = ?', [userId]);
        if (users.length === 0) {
            return { success: false, error: 'User not found' };
        }
        return { success: true, user: { ...users[0], name: users[0].uname } };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-google-login', async () => {
    console.log('🔵 IPC: db-google-login triggered');
    try {
        console.log('🔵 Google Client ID:', process.env.GOOGLE_CLIENT_ID ? 'Exists' : 'MISSING');
        const result = await googleSignIn(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        console.log('🔵 Google Sign-In Result:', result.success ? 'Success' : 'Failed');

        if (result.success) {
            // Check if user exists in database
            const users = await dbQuery('SELECT * FROM `users` WHERE `email` = ?', [result.user.email]);
            let user;

            if (users.length === 0) {
                // Register new Google user (dummy password since it's Google login)
                const insertResult = await dbQuery(
                    'INSERT INTO `users` (`uname`, `email`, `password_hash`) VALUES (?, ?, ?)',
                    [result.user.name, result.user.email, 'GOOGLE_AUTH_USER']
                );
                user = { id: insertResult.insertId, name: result.user.name, email: result.user.email };
            } else {
                user = { id: users[0].id, name: users[0].uname, email: users[0].email };
            }

            activeUserId = user.id; // Set session immediately
            saveSessionState(activeUserId);
            console.log(`🔵 Google login successful for: ${user.email}, activeUserId: ${activeUserId}`);
            return { success: true, user };
        }
        return { success: false, error: 'Google Sign-In failed' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('open-path', async (event, filePath) => {
    if (!filePath) return;
    try {
        if (filePath.startsWith('http')) {
            await shell.openExternal(filePath);
        } else {
            await shell.showItemInFolder(path.resolve(filePath));
        }
    } catch (e) {
        console.error('Failed to open path:', e);
    }
});


