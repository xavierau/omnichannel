import { DataSource } from 'typeorm';
export declare const AppDataSource: DataSource;
/**
 * Initialize database connection with error handling, logging, and retry logic.
 * This function should be called during application startup.
 */
export declare function initializeDatabase(): Promise<DataSource>;
/**
 * Gracefully close database connection.
 * This function should be called during application shutdown.
 */
export declare function closeDatabase(): Promise<void>;
/**
 * Check database connection health.
 * Useful for health check endpoints.
 */
export declare function checkDatabaseHealth(): Promise<boolean>;
/**
 * Get current pool statistics (for monitoring/debugging).
 * Note: This accesses internal pg pool state and may not be available in all scenarios.
 */
export declare function getPoolStatistics(): Record<string, unknown> | null;
