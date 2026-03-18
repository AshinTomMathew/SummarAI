# SummarAI Master Watchdog
# This script starts the Backend and the Tunnel simultaneously 
# and keeps them running forever.

$backendPort = 1001
$projectDir = "c:\Users\Ashin\OneDrive\Desktop\proj\meeting-ai-app"

function Start-Backend {
    Write-Host "🐍 Starting Python Backend..." -ForegroundColor Cyan
    cd $projectDir
    python backend/main.py
}

function Start-Tunnel {
    Write-Host "🌐 Starting Localtunnel Bridge..." -ForegroundColor Green
    # We use a fixed subdomain if possible, but Localtunnel free doesn't always guarantee it.
    # Replace 'curly-peas-beg' with your favorite subdomain if you want to try and lock it.
    npx localtunnel --port $backendPort --subdomain "summarai-official"
}

# Run both in background jobs
Write-Host "🚀 SummarAI Cloud-Bridge is initializing..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop everything."

# Start Backend job
$backendJob = Start-Job -ScriptBlock { 
    param($dir) 
    cd $dir
    python backend/main.py 
} -ArgumentList $projectDir

# Start Tunnel job
$tunnelJob = Start-Job -ScriptBlock { 
    param($port) 
    npx localtunnel --port $port --subdomain "summarai-official"
} -ArgumentList $backendPort

Write-Host "✅ Both processes are running in the background."
Write-Host "Monitoring for crashes..."

while ($true) {
    if ($backendJob.State -ne "Running") {
        Write-Host "⚠️ Backend crashed! Restarting..." -ForegroundColor Red
        $backendJob = Start-Job -ScriptBlock { param($dir) cd $dir; python backend/main.py } -ArgumentList $projectDir
    }
    if ($tunnelJob.State -ne "Running") {
        Write-Host "⚠️ Tunnel disconnected! Reconnecting..." -ForegroundColor Red
        $tunnelJob = Start-Job -ScriptBlock { param($port) npx localtunnel --port $port --subdomain "summarai-official" } -ArgumentList $backendPort
    }
    Start-Sleep -Seconds 10
}
