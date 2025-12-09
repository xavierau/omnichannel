import dotenv from 'dotenv';
import path from 'path';

// Support environment-specific .env files: .env.production, .env.development, .env
const NODE_ENV = process.env.NODE_ENV || 'development';
const envFile = `.env.${NODE_ENV}`;

// Determine the base directory - works in both development (src/) and production (dist/)
// __dirname in dev: backend/src/config/ -> need ../.. to reach backend/
// __dirname in prod: backend/dist/config/ -> need ../.. to reach backend/
const baseDir = path.resolve(__dirname, '../..');

const envPath = path.resolve(baseDir, envFile);
const defaultEnvPath = path.resolve(baseDir, '.env');

// Try to load environment-specific file first, fall back to .env
const result = dotenv.config({ path: envPath });
if (result.error) {
  // Fall back to default .env file
  dotenv.config({ path: defaultEnvPath });
}

export const loadedEnvFile = result.error ? '.env' : envFile;
