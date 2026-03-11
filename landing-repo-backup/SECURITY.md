# SummarAI Security & Permissions Documentation

## Overview
SummarAI is designed with a "Privacy First" architecture. We understand that your meeting data is sensitive, and we have implemented strict controls to ensure your information remains secure.

## Hardware Permissions
When you install SummarAI for Windows, the application will request the following permissions:

### 🎤 Microphone Access
*   **Why?**: To record live meetings directly from your system.
*   **How?**: Audio is captured only when you explicitly click "Start Recording."
*   **Privacy**: Raw audio is streamed to our secure cloud processing pipeline and is NOT stored permanently on your local disk after the session is processed.

### 🖥️ Screen/Window Capture
*   **Why?**: To extract visual slides, whiteboard notes, and shared content during video meetings.
*   **How?**: The app takes periodic screenshots ONLY during active meeting sessions.
*   **Privacy**: Visual data is processed for OCR (Text Recognition) and then discarded or stored securely according to your session history settings.

## Data Processing
*   **Cloud Processing**: Transcription and AI summarization are performed using encrypted channels to our dedicated backend hosted on Render and AI providers (Google Gemini / Groq).
*   **Storage**: Your session history (transcripts and summaries) is stored in a secure PostgreSQL database (Supabase) and is accessible only to you via your authenticated account.
*   **Model Training**: We DO NOT use your personal meeting data to train our AI models.

## How to Revoke Permissions
You can manage these permissions at any time through Windows Settings:
`Settings > Privacy & Security > Microphone / Screen Recording`

For further questions, contact support at security@summarai.io
