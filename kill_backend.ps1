# MeetingAI Zombie Process Killer
# This script finds and kills any process running on port 2611 (Python Backend)

$port = 2611
Write-Host "🔍 Searching for zombie processes on port $port..." -ForegroundColor Cyan

try {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    
    if ($connections) {
        foreach ($conn in $connections) {
            $pid = $conn.OwningProcess
            $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
            
            if ($process) {
                Write-Host "🎯 Found process: $($process.Name) (PID: $pid). Killing it..." -ForegroundColor Yellow
                Stop-Process -Id $pid -Force
                Write-Host "✅ Successfully terminated process." -ForegroundColor Green
            }
        }
    } else {
        Write-Host "✅ Port $port is clear. No zombie processes found." -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Error occurred while trying to clear the port: $_" -ForegroundColor Red
}

# Optional: Kill any stray python processes related to the app
Write-Host "🔍 Checking for stray Python backend processes..." -ForegroundColor Cyan
$strayPy = Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*main.py*" }
if ($strayPy) {
    foreach ($p in $strayPy) {
        Write-Host "🎯 Found stray Python process (PID: $($p.Id)). Killing it..." -ForegroundColor Yellow
        Stop-Process -Id $p.Id -Force
    }
    Write-Host "✅ Stray Python processes cleared." -ForegroundColor Green
} else {
    Write-Host "✅ No stray Python processes detected." -ForegroundColor Green
}

Write-Host "`n🚀 You can now start the application safely." -ForegroundColor Magenta
