import Bull from 'bull';
/**
 * Bull queue configuration.
 *
 * Environment variables:
 * - BULL_REDIS_URL: Redis connection URL (default: redis://localhost:6379)
 * - BULL_CONCURRENCY: Number of concurrent jobs per processor (default: 5)
 */
export declare const BULL_CONFIG: {
    /**
     * Redis connection URL for Bull queues.
     */
    redis: string;
    /**
     * Number of concurrent jobs to process per queue processor.
     */
    concurrency: number;
    /**
     * Template submission queue configuration.
     * Lower concurrency to avoid hitting Meta API rate limits.
     */
    templateSubmission: {
        concurrency: number;
    };
    /**
     * Default job options applied to all jobs.
     */
    defaultJobOptions: {
        /**
         * Number of retry attempts on failure.
         */
        attempts: number;
        /**
         * Backoff strategy for retries.
         */
        backoff: {
            type: "exponential";
            delay: number;
        };
        /**
         * Keep the last N completed jobs for inspection.
         */
        removeOnComplete: number;
        /**
         * Keep the last N failed jobs for debugging.
         */
        removeOnFail: number;
    };
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
export declare function createQueue(name: string): Bull.Queue;
