@echo off
TITLE MeetingAI Port Cleaner
echo --------------------------------------------------
echo [1/2] Searching for zombie backend on port 2611...
echo --------------------------------------------------

powershell -Command "Get-NetTCPConnection -LocalPort 2611 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue; Write-Host '>>> Found and terminated process on port 2611' -ForegroundColor Yellow }"

echo --------------------------------------------------
echo [2/2] Cleaning up any stray Python main.py processes...
echo --------------------------------------------------

powershell -Command "Get-Process -Name 'python' -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*meeting-ai-app*' -or $_.CommandLine -like '*main.py*' } | ForEach-Object { Stop-Process -Id $_.Id -Force; Write-Host '>>> Terminated stray Python process: ' $_.Id -ForegroundColor Yellow }"

echo.
echo ✅ Cleanup Complete! Port 2611 is now free.
echo 🚀 You can now start the app.
echo.
pause
