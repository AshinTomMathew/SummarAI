const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // App info
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),

    // Module 1: Recording & Input Handling
    startRecording: () => ipcRenderer.invoke('start-recording'),
    stopRecording: () => ipcRenderer.invoke('stop-recording'),
    uploadFile: (filePath) => ipcRenderer.invoke('upload-file', filePath),

    // Module 2: Speech-to-Text
    transcribeAudio: (audioData) => ipcRenderer.invoke('transcribe-audio', audioData),

    // Module 3: Content Classification
    classifyContent: (transcript) => ipcRenderer.invoke('classify-content', transcript),

    // Module 4: Adaptive Summary Generator
    generateSummary: (data) => ipcRenderer.invoke('generate-summary', data),

    // Module 5: Visual Extraction
    extractVisuals: (videoPath) => ipcRenderer.invoke('extract-visuals', videoPath),

    // Module 6: Chatbot & Knowledge Retrieval
    chatQuery: (query) => ipcRenderer.invoke('chat-query', query),

    // Module 7: Export & Reporting
    exportReport: (data) => ipcRenderer.invoke('export-report', data),

    // Database operations
    saveSession: (sessionData) => ipcRenderer.invoke('db-save-session', sessionData),
    getSessions: (userId) => ipcRenderer.invoke('db-get-sessions', userId),
    getUser: (userId) => ipcRenderer.invoke('db-get-user', userId),
    login: (credentials) => ipcRenderer.invoke('db-login', credentials),
    register: (userData) => ipcRenderer.invoke('db-register', userData),
    forgotPassword: (email) => ipcRenderer.invoke('db-forgot-password', email),
    googleLogin: () => ipcRenderer.invoke('db-google-login'),

    // Session Management
    setSession: (userId) => ipcRenderer.invoke('auth-set-session', userId),
    getSessionUser: () => ipcRenderer.invoke('auth-get-session-user'),
    logout: () => ipcRenderer.invoke('auth-logout'),
    getActiveId: () => ipcRenderer.invoke('auth-get-active-id'),
    saveTempAudio: (buffer) => ipcRenderer.invoke('save-temp-audio', buffer),
});
