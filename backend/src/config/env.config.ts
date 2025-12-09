import dotenv from 'dotenv';
import path from 'path';

// Determine the project root directory
// __dirname in dev: backend/src/config/ -> need ../../.. to reach project root
// __dirname in prod: backend/dist/config/ -> need ../../.. to reach project root
const projectRoot = path.resolve(__dirname, '../../..');
const envPath = path.resolve(projectRoot, '.env');

// Use override:true because dotenv v17+ auto-loads .env before our code runs
// This ensures our explicitly loaded .env takes precedence
dotenv.config({ path: envPath, override: true });
