import { singleton, inject } from 'tsyringe';
import { BroadcastQueue } from './broadcast.queue';
import { logger } from '../config/logger.config';

/**
 * Default interval for checking scheduled broadcasts (60 seconds).
 */
const DEFAULT_INTERVAL_MS = 60000;

/**
 * Service for periodically checking and processing scheduled broadcasts.
 *
 * Runs a timer that checks for broadcasts whose scheduled time has passed
 * and enqueues them for processing.
 */
@singleton()
export class BroadcastScheduler {
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    @inject(BroadcastQueue) private broadcastQueue: BroadcastQueue
  ) {}

  /**
   * Start the scheduler.
   *
   * Begins periodically checking for scheduled broadcasts that are ready to send.
   *
   * @param intervalMs - Check interval in milliseconds (default: 60000)
   */
  start(intervalMs: number = DEFAULT_INTERVAL_MS): void {
    if (this.intervalId !== null) {
      logger.warn('Scheduler already running, ignoring start request');
      return;
    }

    logger.info('Starting broadcast scheduler', { intervalMs });

    this.intervalId = setInterval(async () => {
      try {
        await this.broadcastQueue.checkScheduledBroadcasts();
      } catch (error) {
        logger.error('Error checking scheduled broadcasts', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    }, intervalMs);
  }

  /**
   * Stop the scheduler.
   *
   * Stops checking for scheduled broadcasts.
   */
  stop(): void {
    if (this.intervalId === null) {
      return;
    }

    clearInterval(this.intervalId);
    this.intervalId = null;

    logger.info('Broadcast scheduler stopped');
  }

  /**
   * Check if the scheduler is running.
   *
   * @returns True if the scheduler is active
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }
}
