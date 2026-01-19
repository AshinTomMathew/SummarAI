# MySQL Database Setup Script for MeetingAI
# Run this script to create the database and tables needed for the application.
# Ensure MySQL is installed and running.

$DB_USER = "root"
$DB_PASS = "" # Change this if you have a MySQL password
$DB_NAME = "meetingai"

Write-Host "🔵 Attempting to setup MeetingAI Database..." -ForegroundColor Cyan

$sqlCommands = @"
CREATE DATABASE IF NOT EXISTS $DB_NAME;
USE $DB_NAME;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uname VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  title VARCHAR(255) NOT NULL,
  udate DATETIME NOT NULL,
  duration INT,
  transcript LONGTEXT,
  summary TEXT,
  classification VARCHAR(100),
  visuals JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  session_id INT,
  urole ENUM('user', 'assistant') NOT NULL,
  umessage TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
);
"@

$tempFile = "temp_schema.sql"
$sqlCommands | Out-File -FilePath $tempFile -Encoding ascii

Write-Host "🔵 Running MySQL commands..." -ForegroundColor Cyan
& mysql -u $DB_USER -p$DB_PASS -e "source $tempFile"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database and Tables created successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to run MySQL commands. Ensure 'mysql' is in your PATH and service is running." -ForegroundColor Red
}

Remove-Item $tempFile
Write-Host "🔵 Setup script finished." -ForegroundColor Cyan
