import 'reflect-metadata'; // Required for TypeORM and tsyringe

// Load environment variables FIRST (before DI container needs them)
// This must be imported before any other config files
import '@config/env.config';

// Initialize DI container BEFORE importing anything that uses it
import { container } from '@config/di.container';

import { createApp } from './app';
import { AppDataSource } from '@config/database.config';
import { BroadcastQueue, BroadcastScheduler } from './jobs';
import { logger } from '@config/logger.config';

const PORT = parseInt(process.env.PORT || '3000', 10);

// Scheduler check interval (default: 60 seconds)
const SCHEDULER_INTERVAL_MS = parseInt(process.env.SCHEDULER_INTERVAL_MS || '60000', 10);

// Job services - initialized after DI container setup
let broadcastQueue: BroadcastQueue | null = null;
let broadcastScheduler: BroadcastScheduler | null = null;

async function bootstrap() {
  try {
    // Initialize database connection
    console.log('Connecting to database...');
    await AppDataSource.initialize();
    console.log('Database connection established');

    // Initialize job queue and scheduler
    await initializeJobServices();

    // Create and start Express app
    const app = createApp();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Health check available at http://localhost:${PORT}/health`);
      console.log(`API docs will be available at http://localhost:${PORT}/api/docs`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Error during server startup:', error);
    process.exit(1);
  }
}

/**
 * Initialize Bull queue and scheduler services.
 */
async function initializeJobServices(): Promise<void> {
  try {
    // Resolve services from DI container
    broadcastQueue = container.resolve(BroadcastQueue);
    broadcastScheduler = container.resolve(BroadcastScheduler);

    // Start the scheduler
    broadcastScheduler.start(SCHEDULER_INTERVAL_MS);

    console.log(`Broadcast scheduler started (interval: ${SCHEDULER_INTERVAL_MS}ms)`);
    logger.info('Job services initialized', {
      schedulerIntervalMs: SCHEDULER_INTERVAL_MS,
    });
  } catch (error) {
    console.error('Failed to initialize job services:', error);
    logger.error('Failed to initialize job services', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Gracefully shutdown job services.
 */
async function shutdownJobServices(): Promise<void> {
  if (broadcastScheduler) {
    broadcastScheduler.stop();
    console.log('Broadcast scheduler stopped');
  }

  if (broadcastQueue) {
    await broadcastQueue.closeQueue();
    console.log('Broadcast queue closed');
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server gracefully...');

  // Shutdown job services first
  await shutdownJobServices();

  // Close database connection
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log('Database connection closed');
  }
  process.exit(0);
});

// Handle SIGINT (Ctrl+C) gracefully
process.on('SIGINT', async () => {
  console.log('SIGINT received, closing server gracefully...');

  // Shutdown job services first
  await shutdownJobServices();

  // Close database connection
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log('Database connection closed');
  }
  process.exit(0);
});

bootstrap();
