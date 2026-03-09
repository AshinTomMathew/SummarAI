-- Supabase PostgreSQL Schema Conversion for MeetingAI

-- Create ENUM for chat roles
DO $$ BEGIN
    CREATE TYPE chat_role AS ENUM ('user', 'assistant');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uname VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    udate TIMESTAMPTZ NOT NULL,
    duration INTEGER,
    transcript TEXT,
    summary TEXT,
    classification VARCHAR(100),
    status VARCHAR(50) DEFAULT 'completed',
    visuals JSONB DEFAULT '[]',
    source_type VARCHAR(50) DEFAULT 'upload',
    source_path TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Chat History Table
CREATE TABLE IF NOT EXISTS chat_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
    urole chat_role NOT NULL,
    umessage TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security) - Recommended for Supabase
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (Allow all for now, refined by user later)
DO $$ BEGIN
    CREATE POLICY "Public profiles are viewable by everyone" ON users FOR SELECT USING (true);
    CREATE POLICY "Users can insert their own profile" ON users FOR INSERT WITH CHECK (true);
    CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (true);

    CREATE POLICY "Sessions are viewable by everyone" ON sessions FOR SELECT USING (true);
    CREATE POLICY "Users can insert sessions" ON sessions FOR INSERT WITH CHECK (true);
    CREATE POLICY "Users can update sessions" ON sessions FOR UPDATE USING (true);

    CREATE POLICY "Chat history viewable by everyone" ON chat_history FOR SELECT USING (true);
    CREATE POLICY "Users can insert chat" ON chat_history FOR INSERT WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Sequence reset for auto-increment after manual data import
-- SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
-- SELECT setval('sessions_id_seq', (SELECT MAX(id) FROM sessions));
-- SELECT setval('chat_history_id_seq', (SELECT MAX(id) FROM chat_history));
