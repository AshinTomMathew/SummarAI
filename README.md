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
    *   **Visual Mindmap**: Interactive, graph-based mind maps with hierarchical knowledge structure (powered by Mermaid.js).
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

### 6. Grounded AI with Visual Intelligence
*   **Frame Extraction**: Automatically captures up to 30 high-resolution (1080p) frames from videos at strategic intervals.
*   **OCR-Powered Text Recognition**: Uses Tesseract OCR to extract text from slides, presentations, whiteboards, and diagrams.
*   **Visual Context Integration**: Extracted visual content is analyzed alongside audio transcripts to provide comprehensive, grounded insights.
*   **Smart Frame Selection**: Intelligent frame distribution ensures coverage across the entire video duration for maximum context capture.
*   **On-Demand Viewing**: Visual frames are hidden by default and accessible via a dedicated "View Extracted Frames" button, opening a full-screen gallery with timestamps and OCR text.
*   **Grounded Responses**: AI chat responses are grounded in both spoken content and visual materials, ensuring accurate, context-aware answers.

### 7. Fun & Engagement - Content-Based Learning Games
*   **Content Quiz Game**: Auto-generated fill-in-the-blank questions from your actual meeting transcript - test your knowledge retention!
*   **Word Match Game**: Match key terms extracted from the session with their contextual definitions - perfect for vocabulary building.
*   **Snake Game**: Classic arcade game for quick brain breaks during long analysis sessions.
*   **Smart Integration**: Games appear during processing (floating button) and are accessible anytime from the Transcript page via "Play Games" button.
*   **Educational Value**: Quiz and Word Match games use real content from YOUR sessions, making learning personalized and relevant.
*   **Optimized Performance**: Reduced processing time with faster AI analysis (6000 character chunks) and streamlined visual extraction (15 frames max).

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
DB_NAME=meetingai
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

## 📈 Project Status & Roadmap

### Current Progress: **95% Complete**
| Module | Progress | Status |
| :--- | :--- | :--- |
| **Analysis Engine (Groq/Llama)** | 100% | Done |
| **Visual/OCR Pipeline** | 100% | Done |
| **Educational Game Suite** | 100% | Done |
| **Meeting Vault & History** | 95% | Polishing |
| **Multi-Input Processing** | 100% | Done |
| **UI/UX Aesthetics** | 98% | Polishing |

### 🚀 Future Roadmap
*   **🌍 Multi-lingual Support**: Real-time translation and transcription for 50+ languages.
*   **📅 Calendar Integration**: Seamless sync with Google Calendar & Outlook for automated processing.
*   **🎭 Sentiment Analysis**: Advanced detection of speaker tones and meeting climate.
*   **📱 Mobile Companion**: View analysis results and chat with your meetings on iOS/Android.
*   **🤝 Team Collaboration**: Real-time collaborative workspace for shared meeting notes.

---

Developed as a Third Year MCA Project.  
**Turn conversations into conclusions with MeetingAI (Summar AI).**
