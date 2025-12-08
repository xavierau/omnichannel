"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata"); // Required for TypeORM and tsyringe
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables FIRST (before DI container needs them)
dotenv_1.default.config();
// Initialize DI container BEFORE importing anything that uses it
const di_container_1 = require("@config/di.container");
const app_1 = require("./app");
const database_config_1 = require("@config/database.config");
const jobs_1 = require("./jobs");
const logger_config_1 = require("@config/logger.config");
const PORT = parseInt(process.env.PORT || '3000', 10);
// Scheduler check interval (default: 60 seconds)
const SCHEDULER_INTERVAL_MS = parseInt(process.env.SCHEDULER_INTERVAL_MS || '60000', 10);
// Job services - initialized after DI container setup
let broadcastQueue = null;
let broadcastScheduler = null;
async function bootstrap() {
    try {
        // Initialize database connection
        console.log('Connecting to database...');
        await database_config_1.AppDataSource.initialize();
        console.log('Database connection established');
        // Initialize job queue and scheduler
        await initializeJobServices();
        // Create and start Express app
        const app = (0, app_1.createApp)();
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            console.log(`Health check available at http://localhost:${PORT}/health`);
            console.log(`API docs will be available at http://localhost:${PORT}/api/docs`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    }
    catch (error) {
        console.error('Error during server startup:', error);
        process.exit(1);
    }
}
/**
 * Initialize Bull queue and scheduler services.
 */
async function initializeJobServices() {
    try {
        // Resolve services from DI container
        broadcastQueue = di_container_1.container.resolve(jobs_1.BroadcastQueue);
        broadcastScheduler = di_container_1.container.resolve(jobs_1.BroadcastScheduler);
        // Start the scheduler
        broadcastScheduler.start(SCHEDULER_INTERVAL_MS);
        console.log(`Broadcast scheduler started (interval: ${SCHEDULER_INTERVAL_MS}ms)`);
        logger_config_1.logger.info('Job services initialized', {
            schedulerIntervalMs: SCHEDULER_INTERVAL_MS,
        });
    }
    catch (error) {
        console.error('Failed to initialize job services:', error);
        logger_config_1.logger.error('Failed to initialize job services', {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}
/**
 * Gracefully shutdown job services.
 */
async function shutdownJobServices() {
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
    if (database_config_1.AppDataSource.isInitialized) {
        await database_config_1.AppDataSource.destroy();
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
    if (database_config_1.AppDataSource.isInitialized) {
        await database_config_1.AppDataSource.destroy();
        console.log('Database connection closed');
    }
    process.exit(0);
});
bootstrap();
