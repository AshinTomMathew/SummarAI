# SummarAI: Smart Meeting & Video Intelligence Assistant 🧠✨

**SummarAI** is a premium AI-powered desktop application designed to transform long meetings, lectures, and videos into organized, actionable intelligence. Developed for high-performance content analysis, it leverages state-of-the-art AI to handle everything from transcription to visual extraction.

---

## 🚀 Key Features

### 1. Multi-Input Intelligent Import
*   **YouTube/Link Import**: Feed any public URL directly into the app (powered by `yt-dlp`).
*   **Local Media Support**: Seamlessly upload MP4, MOV, MP3, and other media formats.
*   **Live Recording**: High-fidelity microphone capture for real-time meeting transcription.

### 2. Adaptive AI Intelligence (Pro-Level)
*   **Content-Aware Analysis**: Automatically classifies recordings into **Educational, Business, Team Meeting, Podcast, or Interview**.
*   **Advanced AI Transformations**: One-click reformatting of summaries into:
    *   **Points**: Structured, decision-oriented bullet points.
    *   **Mindmap**: Educational study guides with text-based mindmaps, flashcards, and keynotes.
    *   **Speaker Breakdown**: Detailed attribution of "who said what".
*   **Unified AI Engine**: Powered by **Groq (Llama-3.3-70b)** for lightning-fast analysis.

### 3. Integrated Media & Visuals
*   **In-Page Media Player**: Watch uploaded videos or listen to audio directly within the Analysis Result page.
*   **Visual Extraction & OCR**: Extracts key frames and runs OCR (Optical Character Recognition) to capture text from slides and whiteboard diagrams.
*   **Full-Screen Focus**: Expandable views for summary and transcript for deep reading.

### 4. Interactive Knowledge Chat
*   Discuss your meetings with an AI that understands the full context of what was said and shown.
*   Ask questions, clarify complex terms, or generate new ideas based on the session.

### 5. Professional Export
*   Generate polished reports in **PDF, DOCX (Word), or TXT** formats.
*   Automated temporary storage management keeps your system clean.

---

## 🛠️ Technology Stack
*   **Frontend**: React.js, Vanilla CSS, Material Symbols.
*   **Backend (Desktop)**: Electron.js (Node.js).
*   **AI Backend**: FastAPI (Python), Groq Cloud API (Whisper v3 & Llama 3.3).
*   **Database**: MySQL & SQLite for persistent meeting history.
*   **Media Processing**: FFmpeg, PyInstaller, yt-dlp.

---

## � Setup & Installation

### 1. Prerequisites
*   Python 3.10+
*   Node.js & npm
*   MySQL Server (Running locally)
*   FFmpeg installed on system PATH

### 2. Configuration
Create a `.env` file in the root directory:
```env
GROQ_API_KEY=your_groq_key_here
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=summarai
```

### 3. Quick Start
1.  **Install Frontend Deps**: `npm install`
2.  **Install Backend Deps**: `pip install -r backend/requirements.txt`
3.  **Run Application**: `npm run dev`

---

## � Project Structure
*   `/src`: React components and page layouts (UI).
*   `/electron`: Main process logic and secure IPC bridging.
*   `/backend`: FastAPI server, AI services (Analysis, Transcription, Visuals).
*   `/.env`: Security configuration (ignored by Git).

---

Developed as a Final Year MCA Project.  
**Turn conversations into conclusions with SummarAI.**
