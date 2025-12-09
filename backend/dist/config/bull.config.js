"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BULL_CONFIG = void 0;
exports.createQueue = createQueue;
const bull_1 = __importDefault(require("bull"));
/**
 * Bull queue configuration.
 *
 * Environment variables:
 * - BULL_REDIS_URL: Redis connection URL (default: redis://localhost:6379)
 * - BULL_CONCURRENCY: Number of concurrent jobs per processor (default: 5)
 */
exports.BULL_CONFIG = {
    /**
     * Redis connection URL for Bull queues.
     */
    redis: process.env.BULL_REDIS_URL || 'redis://localhost:6379',
    /**
     * Number of concurrent jobs to process per queue processor.
     */
    concurrency: parseInt(process.env.BULL_CONCURRENCY || '5', 10),
    /**
     * Template submission queue configuration.
     * Lower concurrency to avoid hitting Meta API rate limits.
     */
    templateSubmission: {
        concurrency: parseInt(process.env.BULL_TEMPLATE_CONCURRENCY || '2', 10),
    },
    /**
     * Default job options applied to all jobs.
     */
    defaultJobOptions: {
        /**
         * Number of retry attempts on failure.
         */
        attempts: 3,
        /**
         * Backoff strategy for retries.
         */
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        /**
         * Keep the last N completed jobs for inspection.
         */
        removeOnComplete: 100,
        /**
         * Keep the last N failed jobs for debugging.
         */
        removeOnFail: 100,
    },
};
/**
 * Creates a new Bull queue with the standard configuration.
 *
 * @param name - The name of the queue
 * @returns A configured Bull queue instance
 *
 * @example
 * ```typescript
 * const broadcastQueue = createQueue('broadcasts');
 * ```
 */
function createQueue(name) {
    return new bull_1.default(name, exports.BULL_CONFIG.redis, {
        defaultJobOptions: exports.BULL_CONFIG.defaultJobOptions,
    });
}
