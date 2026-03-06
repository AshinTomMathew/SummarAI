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

    // Live Recording Toolbar & Overlays
    showToolbar: () => ipcRenderer.invoke('show-toolbar'),
    hideToolbar: () => ipcRenderer.invoke('hide-toolbar'),
    takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),
    triggerStopRecordingSender: () => ipcRenderer.invoke('trigger-stop-recording-sender'),
    onTriggerStopRecording: (callback) => ipcRenderer.on('trigger-stop-recording', callback),
    removeTriggerStopRecordingListener: () => ipcRenderer.removeAllListeners('trigger-stop-recording'),
    triggerPauseRecordingSender: (isPaused) => ipcRenderer.invoke('trigger-pause-recording-sender', isPaused),
    onTriggerPauseRecording: (callback) => ipcRenderer.on('trigger-pause-recording', callback),
    removeTriggerPauseRecordingListener: () => ipcRenderer.removeAllListeners('trigger-pause-recording'),
    showDrawingOverlay: () => ipcRenderer.invoke('show-drawing-overlay'),
    hideDrawingOverlay: () => ipcRenderer.invoke('hide-drawing-overlay'),

    // Module 2: Speech-to-Text
    transcribeAudio: (audioData) => ipcRenderer.invoke('transcribe-audio', audioData),

    // Module 3: Content Classification
    classifyContent: (transcript) => ipcRenderer.invoke('classify-content', transcript),

    // Module 4: Adaptive Summary Generator
    generateSummary: (data) => ipcRenderer.invoke('generate-summary', data),
    analyzeContent: (transcript) => ipcRenderer.invoke('analyze-content', transcript),
    transformContent: (data) => ipcRenderer.invoke('transform-content', data),
    generateBrainTeaser: (transcript) => ipcRenderer.invoke('generate-brain-teaser', transcript),

    // Module 5: Visual Extraction
    extractVisuals: (videoPath) => ipcRenderer.invoke('extract-visuals', videoPath),
    updateVisuals: (data) => ipcRenderer.invoke('db-update-visuals', data),

    // Module 6: Chatbot & Knowledge Retrieval
    chatQuery: (query) => ipcRenderer.invoke('chat-query', query),

    // Module 7: Export & Reporting
    exportReport: (data) => ipcRenderer.invoke('export-report', data),

    // Database operations
    saveSession: (sessionData) => ipcRenderer.invoke('db-save-session', sessionData),
    processLink: (url) => ipcRenderer.invoke('process-link', url),
    getSessions: (userId) => ipcRenderer.invoke('db-get-sessions', userId),
    deleteSession: (sessionId) => ipcRenderer.invoke('db-delete-session', sessionId),
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
    persistRecording: (tempPath) => ipcRenderer.invoke('persist-recording', tempPath),
    ensureRecordingDir: () => ipcRenderer.invoke('ensure-recording-dir'),
    compressMedia: (filePath) => ipcRenderer.invoke('compress-media', filePath),
    openPath: (path) => ipcRenderer.invoke('open-path', path),
});
