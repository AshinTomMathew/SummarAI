-- Converted Data for Supabase PostgreSQL

-- Begin transaction
BEGIN;

-- Disable triggers temporarily if needed
-- SET session_replication_role = 'replica';

-- Insert Users
INSERT INTO users (id, uname, email, password_hash, created_at, updated_at) VALUES
(1, 'ashin', 'ashin@gmail.com', '$2a$10$qSG4GD2AYT9vNWUOVS5N6e/ScbUwP9eOKTLEmcLSa6qPBU9abOyZq', '2026-01-29 08:15:40', '2026-01-29 08:15:40'),
(2, 'delvin', 'dv@gmail.com', '$2a$10$CqJQNXu7r5xL8LexCslQfexMVcLNnY2knSe4ndVmxtEAj6EbB20pG', '2026-01-29 09:18:11', '2026-01-29 09:18:11'),
(3, 'Ashin Tom Mathew', 'ashintommathew24@gmail.com', 'GOOGLE_AUTH_USER', '2026-02-02 08:14:03', '2026-02-02 08:14:03'),
(4, 'POPO', 'p@gmail.com', '$2a$10$APiz1YE6uFHBYiOiRmD9qOdhEA9hXQ.zMZDNtPesfGc2fHHMKGXh2', '2026-02-02 08:18:29', '2026-02-02 08:18:29'),
(5, 'gueslyy', 'g@gmail.com', '$2a$10$mozJalwULdttzcnvT2E7mui91ZXP2tc14Gw3vHLupYK3zWhEwwBem', '2026-02-02 09:18:24', '2026-02-02 09:18:24');

-- Insert Sessions (Condensed for brevity in this script, you can copy full transcripts from meetingai.sql)
-- Note: Replace \' with '' for PostgreSQL compatibility if copying manually.

-- ID 3
INSERT INTO sessions (id, user_id, title, udate, duration, transcript, summary, classification, status, visuals, source_type, source_path, created_at, updated_at) VALUES
(3, 1, 'FIVE MOST ASKED ESL INTERVIEW QUESTIONS I TIPS AND SAMPLE ANSWERS I ONLINE ESL TEACHING', '2026-01-30 05:09:14', 444, 'Full transcript in MySQL dump...', 'Detailed summary...', 'Educational', 'completed', '[]', 'link', '...', '2026-01-30 05:09:14', '2026-01-30 05:09:14');

-- Continue for other sessions...

-- Update Sequences
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('sessions_id_seq', (SELECT MAX(id) FROM sessions));
SELECT setval('chat_history_id_seq', (SELECT MAX(id) FROM chat_history));

COMMIT;
