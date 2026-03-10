import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// Create connection pool
let pool;

export async function initDatabase() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'meetingai',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  console.log(`🔌 Attempting DB Connection to local MySQL: ${config.host}/${config.database}`);

  try {
    // 1. First connect without a database to create it if missing
    const tempConnection = await mysql.createConnection({
      host: config.host,
      user: config.user,
      password: config.password
    });
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\``);
    await tempConnection.end();

    // 2. Now initialize the pool with the database
    pool = mysql.createPool(config);

    // Test connection
    const connection = await pool.getConnection();
    console.log('✅ Local MySQL database connected successfully');

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
      \`summary\` LONGTEXT,
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
      \`urole\` VARCHAR(50) NOT NULL,
      \`umessage\` LONGTEXT NOT NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
      FOREIGN KEY (\`session_id\`) REFERENCES \`sessions\`(\`id\`) ON DELETE SET NULL
    )
  `);

  console.log('✅ Database tables created/verified in local MySQL');
}

export async function query(sql, params) {
  if (!pool) {
    throw new Error('Database is not connected. Please ensure MySQL is running.');
  }
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export function getPool() {
  return pool;
}
