
CREATE DATABASE IF NOT EXISTS `meetingai`;
USE `meetingai`;

-- Users table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `uname` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) UNIQUE NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions table (Wrapped in backticks to avoid keyword issues)
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT,
  `title` VARCHAR(255) NOT NULL,
  `udate` DATETIME NOT NULL,
  `duration` INT,
  `transcript` LONGTEXT,
  `summary` TEXT,
  `classification` VARCHAR(100),
  `visuals` JSON,
  `source_type` VARCHAR(50) DEFAULT 'upload',
  `source_path` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chat History table
CREATE TABLE IF NOT EXISTS `chat_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT,
  `session_id` INT,
  `urole` ENUM('user', 'assistant') NOT NULL,
  `umessage` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
