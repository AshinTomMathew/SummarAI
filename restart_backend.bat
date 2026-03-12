@echo off
taskkill /F /IM python3.13.exe /T 2>nul
taskkill /F /IM python.exe /T 2>nul
timeout /t 1 /nobreak >nul
start "" python backend/main.py
echo Backend restarted!
