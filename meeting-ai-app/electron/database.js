import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// MySQL connection configuration
// Create connection pool
let pool;

export async function initDatabase() {
    // MySQL connection configuration
    // Moved inside function to ensure process.env is loaded
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'meetingai',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    };

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
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      uname VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

    // Sessions table
    await connection.query(`
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
    )
  `);

    // Chat History table
    await connection.query(`
    CREATE TABLE IF NOT EXISTS chat_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      session_id INT,
      urole ENUM('user', 'assistant') NOT NULL,
      umessage TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
    )
  `);

    console.log('✅ Database tables created/verified');
}

export async function query(sql, params) {
    if (!pool) {
        throw new Error('Database is not connected. Please ensure MySQL is running.');
    }
    try {
        const [results] = await pool.execute(sql, params);
        return results;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}

export function getPool() {
    return pool;
}
