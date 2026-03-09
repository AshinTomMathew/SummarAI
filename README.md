<div align="center">
  <img src="https://img.icons8.com/nolan/256/1A6DFF/C822FF/artificial-intelligence.png" alt="SummarAI Logo" width="120" />
  
  # ✨ SummarAI : Smart Meeting & Video Intelligence Assistant ✨
  
  <p align="center">
    <b>Turn conversations into conclusions</b> with state-of-the-art AI transcription, intelligent visual extraction, and unparalleled content summarization. Built for students, professionals, and teams.
  </p>
  
  <p align="center">
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
    <img src="https://img.shields.io/badge/Electron-2B2E3A?style=for-the-badge&logo=electron&logoColor=9FEAF9" alt="Electron" />
    <img src="https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54" alt="Python" />
    <img src="https://img.shields.io/badge/fastapi-109989?style=for-the-badge&logo=FASTAPI&logoColor=white" alt="FastAPI" />
  </p>
</div>

---

## 🚀 About the Project

**SummarAI** is a premium, powerful AI desktop application designed to process long meetings, lectures, and multi-media content into beautifully organized and actionable intelligence. Developed natively for high-performance extraction, the application integrates heavy-hitting ML models to provide a polished desktop-first experience.

---

## 💎 Elite Features

### 🎙 Multi-Input Smart Import
- **🔗 Universal Links**: Directly process YouTube & Google Drive links with built-in `yt-dlp` integration.
- **📂 Local Processing**: Drag and drop any media files (MP3, MP4, MOV, WAV, etc.).
- **🔴 Live Capture**: Built-in real-time microphone recording to transcribe face-to-face meetings dynamically.

### 🧠 Deep AI Intelligence
- **Intelligent Classification**: Automatically classifies the session into *Educational, Team Meeting, Business, Podcast, or Interview*.
- **Multi-Format Summarization**:
  - **🚀 Bullet Points**: Action-oriented, concise takeaways.
  - **🗺 Node-Based Mindmaps**: Deep knowledge graphs visualized with `Mermaid.js`.
  - **👥 Speaker Breakdown**: Strict attribution to accurately track 'who said what'.
- **Interactive Chat**: Consult an ongoing, context-aware chatbot trained perfectly on the session's internal transcripts & visual data.

### 👁‍🗨 Grounded Visual & Contextual Recognition (OCR)
- **Deep Frame Harvesting**: Scans video feeds and extracts up to 30 high-res strategic frames.
- **Tesseract Text Recognition**: Conducts rapid OCR on every frame to grasp whiteboard notes, slide text, and hidden visuals.
- **Holistic AI Base**: Integrates text recognition output side-by-side with audio transcription for flawlessly contextualized AI intelligence.

### 🎯 Fun & Learning Mechanics
Tired of waiting for heavy files to render? Learn while you wait:
- **📝 Content Quiz**: Take on-the-fly fill-in-the-blank exams automatically curated from your meeting transcripts.
- **🧩 Word Matcher**: Grasp key terminology and context mappings dynamically.
- **🐍 Retro Snake Break**: Play built-in arcade titles to relieve mind fatigue.

### 📑 Document Export & Exportation
- Swiftly export unified session logs into **PDF**, **DOCX**, or **TXT**.
- Completely clean cache management leaves zero orphaned file debris on your system.

---

## 🖥 User Interface Highlights

SummarAI ships with a fluid UI structured to reduce mental load.
- **Interactive Dashboard**: Keep track of history and previous processing tasks.
- **Session Split-View**: Watch your video embedded alongside an expandable, sync-scrolling transcript and visual gallery.
- **Dark Mode Optimization**: Silky-smooth color grading powered by strict Tailwind standards.

---

## 🛠 Technology Architecture

### **Frontend & Interface**
- **React 18** + **Vite**
- **TailwindCSS** for rapid atomic styling
- **React Router v6** for seamless single-page-app transitions

### **Wrapper & Desktop Host**
- **Electron.js** with strictly typed IPC bridging for native bridge access
- Local OS File-System Integrations

### **Intelligent Backend**
- **FastAPI** (Python) for asynchronous endpoints
- **Faster Whisper / Transformers** for blazing-speed speech-to-text
- **Groq Cloud Fast LLMs** or **Google Gemini API** for semantic text structuring
- **OpenCV & PyTesseract** for visual recognition pipelines
- **FFmpeg & yt-dlp** for headless media dissection

---

## ⚙️ Getting Started & Installation

### 1. Prerequisites Ensure you have installed:
- [Node.js](https://nodejs.org/) (v16+)
- [Python](https://www.python.org/downloads/) (3.10+) 
- [FFmpeg](https://ffmpeg.org/download.html) (Mandatory - Must be mapped to OS Environment Variables)
- Local SQL Instance (MySQL/SQLite)

### 2. Setting Up Environments
Create a root `.env` configuration file:
```env
# Database Credentials
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=meeting_ai

# API Keys
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret

# Dev Config
NODE_ENV=development
```

### 3. Build & Run locally

> [!NOTE] 
> Install dependencies in both environments before running concurrent builds.

**A. Install React UI Modules**
```bash
npm install
```

**B. Install Python Pipeline**
```bash
cd backend
pip install -r requirements.txt
cd ..
```

**C. Fire Up Dev Environment**
*(Launches simultaneously: Vite Server + React HMR + Electron + Python Worker)*
```bash
npm run electron:dev
```

---

## 🔮 Future Roadmap 
We're barely scratching the surface! Coming soon:
- **🌐 50+ Real-Time Language Translations**
- **🎭 Contextual Sentiment Analytics** (Track meeting tones and moods)
- **📅 Direct Calendar Sync** (Outlook / Google integration)
- **👥 Cloud Team Workspaces**

---

<p align="center">
  <i>Developed for maximum productivity by the <b>SummarAI</b> team.</i> <br>
  Built with ❤️ for better, frictionless meetings.
</p>
