import * as mysqlService from './database.js';
import * as postgresService from './database_pg.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Manual env load if not already handled
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbType = (process.env.DB_TYPE || 'mysql').toLowerCase();
const isPostgres = dbType === 'postgres' || dbType === 'postgresql';

if (isPostgres) {
    console.log('🔵 Electron: Using PostgreSQL/Supabase Mode');
} else {
    console.log('🔵 Electron: Using Local MySQL Mode');
}

const activeService = isPostgres ? postgresService : mysqlService;

export const initDatabase = activeService.initDatabase;
export const query = activeService.query;
export const getPool = activeService.getPool;
