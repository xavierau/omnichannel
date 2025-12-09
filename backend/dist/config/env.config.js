"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadedEnvFile = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Support environment-specific .env files: .env.production, .env.development, .env
const NODE_ENV = process.env.NODE_ENV || 'development';
const envFile = `.env.${NODE_ENV}`;
// Determine the base directory - works in both development (src/) and production (dist/)
// __dirname in dev: backend/src/config/ -> need ../.. to reach backend/
// __dirname in prod: backend/dist/config/ -> need ../.. to reach backend/
const baseDir = path_1.default.resolve(__dirname, '../..');
const envPath = path_1.default.resolve(baseDir, envFile);
const defaultEnvPath = path_1.default.resolve(baseDir, '.env');
// Try to load environment-specific file first, fall back to .env
const result = dotenv_1.default.config({ path: envPath });
if (result.error) {
    // Fall back to default .env file
    dotenv_1.default.config({ path: defaultEnvPath });
}
exports.loadedEnvFile = result.error ? '.env' : envFile;
