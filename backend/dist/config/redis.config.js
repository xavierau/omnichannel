"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = void 0;
exports.getRedisClient = getRedisClient;
exports.closeRedisConnection = closeRedisConnection;
const ioredis_1 = __importDefault(require("ioredis"));
// Create Redis client instance
exports.redisClient = new ioredis_1.default({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: 3,
});
exports.redisClient.on('error', (err) => {
    console.error('Redis connection error:', err);
});
exports.redisClient.on('connect', () => {
    console.log('✅ Redis connected');
});
// Getter function for compatibility
function getRedisClient() {
    return exports.redisClient;
}
async function closeRedisConnection() {
    await exports.redisClient.quit();
    console.log('✅ Redis connection closed');
}
