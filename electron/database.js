import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// MySQL connection configuration
// Create connection pool
let pool;

export async function initDatabase() {
  // MySQL connection configuration
  // Moved inside function to ensure process.env is loaded
  let host = process.env.DB_HOST || '127.0.0.1';
  // Force IPv4 loopback if localhost is used, to avoid ::1 (IPv6) connection errors
  if (host === 'localhost') host = '127.0.0.1';

  const dbConfig = {
    host: host,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'meetingai',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 5000 // 5 seconds timeout
  };

  console.log(`🔌 Attempting DB Connection to ${dbConfig.host} as ${dbConfig.user} on DB: ${dbConfig.database}`);

  try {
    pool = mysql.createPool(dbConfig);

    // Test connection
    const connection = await pool.getConnection();
    console.log('✅ MySQL database connected successfully');

    // Check which database we are connected to
    const [rows] = await connection.query('SELECT DATABASE() as db');
    console.log('🔵 Connected to database:', rows[0].db);

    // Create tables if they don't exist
    await createTables(connection);

    connection.release();
    return { success: true };
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function createTables(connection) {
  // Users table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`users\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`uname\` VARCHAR(255) NOT NULL,
      \`email\` VARCHAR(255) UNIQUE NOT NULL,
      \`password_hash\` VARCHAR(255) NOT NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Sessions table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`sessions\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`user_id\` INT,
      \`title\` VARCHAR(255) NOT NULL,
      \`udate\` DATETIME NOT NULL,
      \`duration\` INT,
      \`transcript\` LONGTEXT,
      \`summary\` TEXT,
      \`classification\` VARCHAR(100),
      \`visuals\` JSON,
      \`source_type\` VARCHAR(50) DEFAULT 'upload',
      \`source_path\` TEXT,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    )
  `);

  // Chat History table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`chat_history\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`user_id\` INT,
      \`session_id\` INT,
      \`urole\` ENUM('user', 'assistant') NOT NULL,
      \`umessage\` TEXT NOT NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
      FOREIGN KEY (\`session_id\`) REFERENCES \`sessions\`(\`id\`) ON DELETE SET NULL
    )
  `);

  console.log('✅ Database tables created/verified');

  // Verify and Add Missing Columns (MIGRATION)
  try {
    // Check source_type
    const [stCol] = await connection.query('SHOW COLUMNS FROM `sessions` LIKE "source_type"');
    if (stCol.length === 0) {
      console.log('🛠️ Migration: Adding source_type column...');
      await connection.query("ALTER TABLE `sessions` ADD COLUMN source_type VARCHAR(50) DEFAULT 'upload' AFTER classification");
    }

    // Check source_path
    const [spCol] = await connection.query('SHOW COLUMNS FROM `sessions` LIKE "source_path"');
    if (spCol.length === 0) {
      console.log('🛠️ Migration: Adding source_path column...');
      await connection.query("ALTER TABLE `sessions` ADD COLUMN source_path TEXT AFTER source_type");
    }

    // Check visuals
    const [vCol] = await connection.query('SHOW COLUMNS FROM `sessions` LIKE "visuals"');
    if (vCol.length === 0) {
      console.log('🛠️ Migration: Adding visuals column...');
      await connection.query("ALTER TABLE `sessions` ADD COLUMN visuals JSON AFTER classification");
    }
  } catch (migErr) {
    console.warn('⚠️ Migration Warning:', migErr.message);
  }
}

export async function query(sql, params) {
  if (!pool) {
    throw new Error('Database is not connected. Please ensure MySQL is running.');
  }
  try {
    // Replace undefined with null to avoid MySQL errors
    const safeParams = (params || []).map(p => p === undefined ? null : p);

    // console.log('Query params (safe):', safeParams); // Optional: Uncomment for debug

    const [results] = await pool.execute(sql, safeParams);
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export function getPool() {
  return pool;
}
