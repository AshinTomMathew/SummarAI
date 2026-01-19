import { app, BrowserWindow, ipcMain, protocol, shell } from 'electron';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
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
import { processUrl } from './ai/urlProcessor.js'; // Added
import fs from 'fs';

// Define __dirname and __filename for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PYTHON_API_BASE = 'http://127.0.0.1:8000';

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

let mainWindow;
let activeUserId = null; // Track currently logged in user
let pyProcess = null; // Track backend process globaly
let isBackendReady = false; // Flag to track backend health

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
let isSpawning = false;
async function spawnPythonBackend() {
    if (pyProcess || isSpawning) {
        console.log('🔵 Python Backend is already running or spawning.');
        return;
    }

    isSpawning = true;
    console.log('🔍 Checking for existing backend on port 8000...');
    const isAlreadyRunning = await checkBackendHealth(3, 500); // Quick check
    if (isAlreadyRunning) {
        console.log('✅ Found existing backend. Reusing it.');
        isBackendReady = true;
        isSpawning = false;
        return;
    }

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
        console.log('🚀 Spawning Python Backend:', pyPath, args.join(' '));

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
            console.error('❌ Failed to start Python Backend:', err);
            isSpawning = false;
        });

        pyProcess.on('exit', (code) => {
            console.log(`🐍 Backend exited with code ${code}`);
            pyProcess = null;
            isBackendReady = false;
            isSpawning = false;
        });

        pyProcess.unref();

        app.on('will-quit', () => {
            if (pyProcess) {
                console.log('🛑 Killing Python Backend...');
                pyProcess.kill();
                pyProcess = null;
            }
        });
    } else {
        console.error('❌ Python Backend not found at:', pyPath);
        isSpawning = false;
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
                    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https://lh3.googleusercontent.com https://www.gstatic.com https://generativelanguage.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com;"
                ]
            }
        });
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
    // Register custom protocol for local media
    protocol.registerFileProtocol('media', (request, callback) => {
        const url = request.url.replace('media://', '');
        try {
            return callback(decodeURIComponent(url));
        } catch (error) {
            console.error('Failed to register protocol', error);
        }
    });
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
    return { success: true };
});

ipcMain.handle('auth-get-session-user', async () => {
    if (!activeUserId) {
        return { success: false, error: 'No active session' };
    }
    try {
        const users = await dbQuery('SELECT id, uname, email FROM users WHERE id = ?', [activeUserId]);
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

ipcMain.handle('chat-query', async (event, { query: userQuery, userId, sessionId, transcript: providedTranscript }) => {
    console.log('💬 IPC: [GEMINI CHAT] chat-query');
    try {
        // We use the already implemented cloud-based chatQuery for speed & quality
        const result = await chatQuery(userQuery, userId, sessionId, providedTranscript);
        return result;
    } catch (error) {
        console.error('❌ Chat Error:', error);
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
    const filename = `Report_${sessionData.title.replace(/\s+/g, '_')}_${Date.now()}`;
    const exportsPath = path.join(app.getPath('temp'), 'SummarAI', 'exports');
    if (!fs.existsSync(exportsPath)) fs.mkdirSync(exportsPath, { recursive: true });

    if (format === 'pdf') {
        const outputPath = path.join(exportsPath, `${filename}.pdf`);
        const result = await createPDFReport(sessionData, outputPath);
        if (result.success) shell.showItemInFolder(outputPath);
        return result;
    } else if (format === 'docx') {
        const outputPath = path.join(exportsPath, `${filename}.docx`);
        const result = await createDocxReport(sessionData, outputPath);
        if (result.success) shell.showItemInFolder(outputPath);
        return result;
    } else if (format === 'txt') {
        const outputPath = path.join(exportsPath, `${filename}.txt`);
        const content = `Title: ${sessionData.title}\nDate: ${new Date(sessionData.date).toLocaleString()}\n\nSummary:\n${sessionData.summary}\n\nTranscript:\n${sessionData.transcript}`;
        fs.writeFileSync(outputPath, content);
        shell.showItemInFolder(outputPath);
        return { success: true, path: outputPath };
    }
    return { success: false, error: 'Unsupported format' };
});

// Database & Authentication Handlers
ipcMain.handle('db-login', async (event, { email, password }) => {
    try {
        const users = await dbQuery('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return { success: false, error: 'User not found' };
        }

        const user = users[0];
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return { success: false, error: 'Invalid password' };
        }

        activeUserId = user.id; // Set session immediately
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
        const existingUsers = await dbQuery('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return { success: false, error: 'Email already registered' };
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insert user
        const result = await dbQuery(
            'INSERT INTO users (uname, email, password_hash) VALUES (?, ?, ?)',
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
        const users = await dbQuery('SELECT * FROM users WHERE email = ?', [email]);
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
            'INSERT INTO sessions (user_id, title, udate, duration, transcript, summary, classification, visuals, source_type, source_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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

ipcMain.handle('db-get-sessions', async (event, userId) => {
    try {
        let query = 'SELECT * FROM sessions WHERE user_id = ? ORDER BY udate DESC';
        let params = [userId];

        if (!userId) {
            query = 'SELECT * FROM sessions WHERE user_id IS NULL ORDER BY udate DESC';
            params = [];
        }

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
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-get-user', async (event, userId) => {
    try {
        const users = await dbQuery('SELECT id, uname, email FROM users WHERE id = ?', [userId]);
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
            const users = await dbQuery('SELECT * FROM users WHERE email = ?', [result.user.email]);
            let user;

            if (users.length === 0) {
                // Register new Google user (dummy password since it's Google login)
                const insertResult = await dbQuery(
                    'INSERT INTO users (uname, email, password_hash) VALUES (?, ?, ?)',
                    [result.user.name, result.user.email, 'GOOGLE_AUTH_USER']
                );
                user = { id: insertResult.insertId, name: result.user.name, email: result.user.email };
            } else {
                user = { id: users[0].id, name: users[0].uname, email: users[0].email };
            }

            activeUserId = user.id; // Set session immediately
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


