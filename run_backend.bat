@echo off
setlocal enabledelayedexpansion

:: Enhanced Backend Watchdog Launcher
:: Automatically restarts the backend if it crashes

title SummarAI Backend Watchdog

:loop
cls
echo ======================================================
echo 🚀 SummarAI Backend Watchdog (Active)
echo ======================================================
echo Time: %date% %time%
echo Status: Starting Backend Pipeline...
echo.

:: Run the backend
python backend/main.py

:: If it exits, log it
echo.
echo ⚠️ [CRASH DETECTED] Backend process terminated incorrectly.
echo Exit Code: %errorlevel%
echo Restarting in 5 seconds...
echo.

:: Wait before restart to prevent tight loops on persistent errors
timeout /t 5 /nobreak > nul

goto loop
