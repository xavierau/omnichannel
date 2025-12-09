"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Determine the project root directory
// __dirname in dev: backend/src/config/ -> need ../../.. to reach project root
// __dirname in prod: backend/dist/config/ -> need ../../.. to reach project root
const projectRoot = path_1.default.resolve(__dirname, '../../..');
const envPath = path_1.default.resolve(projectRoot, '.env');
// Use override:true because dotenv v17+ auto-loads .env before our code runs
// This ensures our explicitly loaded .env takes precedence
dotenv_1.default.config({ path: envPath, override: true });
