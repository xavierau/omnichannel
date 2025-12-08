import { BroadcastQueue } from './broadcast.queue';
/**
 * Service for periodically checking and processing scheduled broadcasts.
 *
 * Runs a timer that checks for broadcasts whose scheduled time has passed
 * and enqueues them for processing.
 */
export declare class BroadcastScheduler {
    private broadcastQueue;
    private intervalId;
    constructor(broadcastQueue: BroadcastQueue);
    /**
     * Start the scheduler.
     *
     * Begins periodically checking for scheduled broadcasts that are ready to send.
     *
     * @param intervalMs - Check interval in milliseconds (default: 60000)
     */
    start(intervalMs?: number): void;
    /**
     * Stop the scheduler.
     *
     * Stops checking for scheduled broadcasts.
     */
    stop(): void;
    /**
     * Check if the scheduler is running.
     *
     * @returns True if the scheduler is active
     */
    isRunning(): boolean;
}
