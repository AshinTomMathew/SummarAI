# MeetingAI: Smart Adaptive Meeting & Video Note Generator

MeetingAI is a premium desktop application designed to turn long meetings and videos into actionable intelligence. It uses generative AI to provide content-adaptive summaries, speaker-diarized transcripts, and visual extraction of key frames and diagrams.

## ✨ Core Functionalities

1.  **Multi-Source Meeting & Video Input**:
    *   **YouTube Support**: Import directly via URL (requires `yt-dlp`).
    *   **Direct Upload**: Support for MP4, MOV, MP3, and other common media formats.
    *   **Hybrid Recording System**: Capture live audio from your microphone for real-time analysis.

2.  **Smart Adaptive Summaries (Module 4)**:
    *   Adaptive templates for **Educational, Business, Team Meeting, Podcast, and Interview** content.
    *   Intelligent extraction of key points, action items, and technical concepts.

3.  **Speaker-Labeled Transcription (Module 2)**:
    *   Powered by Gemini 1.5 Flash for high accuracy.
    *   Identifies different speakers (Speaker A, Speaker B) for clear context.

4.  **Visual Extraction & OCR (Module 5)**:
    *   Extracts key frames from video recordings.
    *   Runs OCR (Optical Character Recognition) to capture text from slides and diagrams.

5.  **Intelligent Chatbot (Module 6)**:
    *   Discuss your meetings with an AI that "remembers" the entire transcript and visuals.
    *   Ask questions, clarify points, or request specific information from the meeting context.

6.  **Multi-Format Export (Module 7)**:
    *   Generate professional reports in **PDF, DOCX, or TXT** formats.
    *   Reports include Title, Summary, and Full Transcript.

---

## 🛠️ Technical Stack

*   **Frontend**: React, Tailwind CSS, Material Symbols.
*   **Backend (Desktop)**: Electron (Node.js).
*   **AI Engine**: Google Gemini 1.5 Flash API.
*   **Database**: MySQL (for persistence) + Local Guest Mode.
*   **Media Processing**: FFmpeg, node-fetch, Tesseract.js.

---

## 🚀 Setup Instructions

### 1. Database Setup
Ensure MySQL is running on your system.
*   Run the included `setup_db.ps1` in PowerShell to automatically create the `meetingai` database and all necessary tables.
*   Alternatively, run the `database_schema.sql` script directly in your MySQL workbench.

### 2. Environment Variables
Create a `.env` file in the root directory with the following keys:
```env
GEMINI_API_KEY=your_gemini_api_key_here
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=meetingai
GOOGLE_CLIENT_ID=optional_for_google_login
GOOGLE_CLIENT_SECRET=optional_for_google_login
```

### 3. Dependencies
*   Install **yt-dlp** and **ffmpeg** on your system path for YouTube import support.
*   Run `npm install` to install project dependencies.

### 4. Running the App
*   **Development**: `npm run electron:dev`
*   **Build Executable**: `npm run electron:build` (Outputs to `release/` folder).

---

## 👤 User Modes

*   **Temporary (Guest) Mode**: Complete access to AI features. Data is processed locally and discarded when the app is closed. Perfect for privacy-conscious users.
*   **Logged-in User Mode**: Securely stores your meetings, transcripts, and summaries in the MySQL database linked to your account.

---

Developed for **Advanced Agentic Coding** submission.
MeetingAI - Turning conversations into conclusions.
