import dotenv from 'dotenv';
import path from 'path';

// Determine the base directory - works in both development (src/) and production (dist/)
// __dirname in dev: backend/src/config/ -> need ../.. to reach backend/
// __dirname in prod: backend/dist/config/ -> need ../.. to reach backend/
const baseDir = path.resolve(__dirname, '../..');
const envPath = path.resolve(baseDir, '.env');

// Use override:true because dotenv v17+ auto-loads .env before our code runs
// This ensures our explicitly loaded .env takes precedence
dotenv.config({ path: envPath, override: true });
