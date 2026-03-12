taskkill /F /IM node.exe /T
taskkill /F /IM python.exe /T
taskkill /F /IM python3.13.exe /T
taskkill /F /IM electron.exe /T
taskkill /F /IM MeetingAI.exe /T
echo "All app processes killed. You can now restart with: npm run electron:dev"
