/* 
 * API Polyfill for Web Environments (Render Deployment)
 * This allows the React app to work on the web by proxying 
 * electronAPI calls to the FastAPI backend directly via fetch.
 */

const BACKEND_URL = import.meta.env.VITE_API_URL || "https://your-backend-url.render.com";

const webAPI = {
    getActiveId: async () => {
        // In web mode, we might use local storage or a session cookie
        return localStorage.getItem('web_user_id') || null;
    },
    getUser: async (userId) => {
        try {
            const resp = await fetch(`${BACKEND_URL}/db/user/${userId}`);
            return await resp.json();
        } catch (e) { return { success: false, error: e.message }; }
    },
    getSessions: async (userId) => {
        try {
            const resp = await fetch(`${BACKEND_URL}/db/sessions?user_id=${userId}`);
            return await resp.json();
        } catch (e) { return { success: false, error: e.message }; }
    },
    // Add other methods as needed or a generic invoker
    invoke: async (channel, ...args) => {
        console.log(`Web Proxy: calling ${channel}`, args);
        // This is a simplified proxy. You'll need to map IPC channels to REST endpoints.
    }
};

// If not in Electron, inject the web polyfill
if (!window.electronAPI) {
    console.warn("🌐 MeetingAI: No Electron found. Injecting Web API Proxy...");
    window.electronAPI = webAPI;
}
