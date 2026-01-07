import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { initDatabase, query } from './database.js';
import { generateSummary, classifyContent } from './ai/summarizer.js';
import { createPDFReport } from './ai/export.js';
import { processAudio } from './ai/recorder.js';
import { googleSignIn } from './auth.js';
import dotenv from 'dotenv';
import { transcribeAudio } from './ai/transcriber.js';
import { extractVisuals } from './ai/visuals.js';
import { chatQuery } from './ai/chatbot.js';

// Define __dirname and __filename for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔵 main.js: Starting Electron...');

// Load environment variables
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const envPath = isDev
    ? path.join(__dirname, '../.env')
    : path.join(process.resourcesPath, 'app.asar/.env');
const externalEnvPath = path.join(path.dirname(app.getPath('exe')), '.env');

dotenv.config({ path: envPath });
// External override
dotenv.config({ path: externalEnvPath, override: true });

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

    // Initialize database
    const dbStatus = await initDatabase();
    if (!dbStatus.success) {
        console.error('Database initialization failed:', dbStatus.error);
    }

    // Load the app
    if (process.env.NODE_ENV === 'development') {
        console.log('🔵 Loading URL: http://localhost:5173');
        mainWindow.loadURL('http://localhost:5173');
        // mainWindow.webContents.openDevTools(); // Disabled - uncomment to enable DevTools
    } else {
        console.log('🔵 Loading File: index.html');
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
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
    createWindow();

    app.on('activate', () => {
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
        const users = await query('SELECT id, uname, email FROM users WHERE id = ?', [activeUserId]);
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

ipcMain.handle('upload-file', async (event, filePath) => {
    // Determine file type and process accordingly
    // For now, assume audio/video processing
    return await processAudio(filePath);
});

ipcMain.handle('transcribe-audio', async (event, audioData) => {
    // audioData could be a path or buffer
    return await transcribeAudio(audioData);
});

ipcMain.handle('classify-content', async (event, transcript) => {
    return await classifyContent(transcript);
});

ipcMain.handle('generate-summary', async (event, transcript) => {
    return await generateSummary(transcript);
});

ipcMain.handle('extract-visuals', async (event, videoPath) => {
    return await extractVisuals(videoPath);
});

ipcMain.handle('chat-query', async (event, { query, userId, sessionId }) => {
    return await chatQuery(query, userId, sessionId);
});

ipcMain.handle('save-temp-audio', async (event, buffer) => {
    try {
        const tempPath = path.join(app.getPath('temp'), `meeting_live_${Date.now()}.webm`);
        fs.writeFileSync(tempPath, Buffer.from(buffer));
        console.log('🔵 Live recording saved to temp:', tempPath);
        return { success: true, path: tempPath };
    } catch (error) {
        console.error('❌ Failed to save temp audio:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('export-report', async (event, { sessionData, format }) => {
    if (format === 'pdf') {
        const outputPath = path.join(app.getPath('downloads'), `Report_${sessionData.title.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
        await createPDFReport(sessionData, outputPath);
        return { success: true, path: outputPath };
    }
    return { success: false, error: 'Unsupported format' };
});

// Database & Authentication Handlers
ipcMain.handle('db-login', async (event, { email, password }) => {
    try {
        const users = await query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return { success: false, error: 'User not found' };
        }

        const user = users[0];
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return { success: false, error: 'Invalid password' };
        }

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
        const existingUsers = await query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return { success: false, error: 'Email already registered' };
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insert user
        const result = await query(
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
        const users = await query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return { success: false, error: 'User not found' };
        }
        return { success: true, message: 'If an account exists with this email, a password reset link has been sent.' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-save-session', async (event, sessionData) => {
    try {
        const { userId, title, date, duration, transcript, summary, classification, visuals } = sessionData;
        const result = await query(
            'INSERT INTO sessions (user_id, title, udate, duration, transcript, summary, classification, visuals) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, title, date, duration, transcript, summary, classification, JSON.stringify(visuals)]
        );
        return { success: true, sessionId: result.insertId };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-get-sessions', async (event, userId) => {
    try {
        const sessions = await query('SELECT * FROM sessions WHERE user_id = ? ORDER BY udate DESC', [userId]);
        return { success: true, sessions: sessions.map(s => ({ ...s, date: s.udate })) };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db-get-user', async (event, userId) => {
    try {
        const users = await query('SELECT id, uname, email FROM users WHERE id = ?', [userId]);
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
            const users = await query('SELECT * FROM users WHERE email = ?', [result.user.email]);
            let user;

            if (users.length === 0) {
                // Register new Google user (dummy password since it's Google login)
                const insertResult = await query(
                    'INSERT INTO users (uname, email, password_hash) VALUES (?, ?, ?)',
                    [result.user.name, result.user.email, 'GOOGLE_AUTH_USER']
                );
                user = { id: insertResult.insertId, name: result.user.name, email: result.user.email };
            } else {
                user = { id: users[0].id, name: users[0].uname, email: users[0].email };
            }

            return { success: true, user };
        }
        return { success: false, error: 'Google Sign-In failed' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});


