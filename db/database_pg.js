import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// Create connection pool
let pool;

export async function initDatabase() {
    // Use the PostgreSQL connection string from .env or fallback to the previous Supabase URL
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.uwsckiidzqbfizrqnjjz:8590529494%40%23@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres';

    console.log(`🔌 Attempting DB Connection to PostgreSQL via Supabase Pooler`);

    try {
        pool = new Pool({
            connectionString,
            // Supabase requires SSL for remote connections
            ssl: {
                rejectUnauthorized: false
            }
        });

        // Test connection
        const client = await pool.connect();
        console.log('✅ PostgreSQL database connected successfully');

        // Check which database we are connected to
        const res = await client.query('SELECT current_database() as db');
        console.log('🔵 Connected to database:', res.rows[0].db);

        // Create tables if they don't exist
        await createTables(client);

        client.release();
        return { success: true };
    } catch (error) {
        console.error('❌ PostgreSQL connection failed:', error.message);
        return { success: false, error: error.message };
    }
}

async function createTables(client) {
    // Users table
    await client.query(`
    CREATE TABLE IF NOT EXISTS "users" (
      id SERIAL PRIMARY KEY,
      uname VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Sessions table
    await client.query(`
    CREATE TABLE IF NOT EXISTS "sessions" (
      id SERIAL PRIMARY KEY,
      user_id INT,
      title VARCHAR(255) NOT NULL,
      udate TIMESTAMP NOT NULL,
      duration INT,
      transcript TEXT,
      summary TEXT,
      classification VARCHAR(100),
      visuals JSONB,
      source_type VARCHAR(50) DEFAULT 'upload',
      source_path TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

    // Chat History table
    await client.query(`
    CREATE TABLE IF NOT EXISTS "chat_history" (
      id SERIAL PRIMARY KEY,
      user_id INT,
      session_id INT,
      urole VARCHAR(50) NOT NULL,
      umessage TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
    )
  `);

    console.log('✅ Database tables created/verified in PostgreSQL');
}

export async function query(sql, params) {
    if (!pool) {
        throw new Error('Database is not connected. Please ensure PostgreSQL is running.');
    }
    try {
        // Replace undefined with null to avoid PostgreSQL errors
        const safeParams = (params || []).map(p => p === undefined ? null : p);

        // --- AUTOMATIC MYSQL TO POSTGRESQL QUERY TRANSLATOR ---
        // 1. Replace MySQL backticks ` ` with PostgreSQL double quotes " "
        let pgSql = sql.replace(/\`/g, '"');

        // 2. Replace MySQL `?` positional parameters with PostgreSQL `$1, $2, ...`
        let paramIndex = 1;
        pgSql = pgSql.replace(/\?/g, () => '$' + (paramIndex++));

        // 3. To preserve the MySQL behavior where INSERT returns `insertId`, 
        // we must append `RETURNING id` to INSERT queries in PostgreSQL.
        const isInsert = /^\s*INSERT\s+INTO/i.test(pgSql);
        if (isInsert && !/RETURNING\s+id\s*$/i.test(pgSql)) {
            pgSql += ' RETURNING id';
        }

        // Execute the translated query
        const result = await pool.query(pgSql, safeParams);

        // 4. Mimic MySQL's return behavior for INSERTs
        if (isInsert && result.rows.length > 0) {
            result.rows.insertId = result.rows[0].id;
        }

        return result.rows;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}

export function getPool() {
    return pool;
}
