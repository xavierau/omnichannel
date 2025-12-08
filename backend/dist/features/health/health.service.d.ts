import { DataSource } from 'typeorm';
import Redis from 'ioredis';
interface ReadinessResponse {
    status: 'ok' | 'degraded';
    timestamp: string;
    checks: {
        database: 'ok' | 'error';
        redis: 'ok' | 'error';
    };
}
interface LivenessResponse {
    status: 'ok';
    timestamp: string;
}
interface BasicHealthResponse {
    status: 'ok';
    timestamp: string;
    uptime: number;
}
/**
 * HealthService provides health check capabilities for the application.
 *
 * Three types of health checks are provided:
 * - Basic: Simple check that the service is running
 * - Liveness: Indicates the service is alive (for Kubernetes liveness probes)
 * - Readiness: Indicates the service can handle requests (checks dependencies)
 */
export declare class HealthService {
    private dataSource;
    private redis;
    constructor(dataSource: DataSource, redis: Redis);
    /**
     * Check database connectivity with timeout.
     * Uses a simple SELECT 1 query to verify the connection.
     */
    checkDatabase(): Promise<boolean>;
    /**
     * Check Redis connectivity with timeout.
     * Uses PING command to verify the connection.
     */
    checkRedis(): Promise<boolean>;
    /**
     * Get readiness status by checking all dependencies.
     * Returns 'ok' only if all dependencies are healthy, 'degraded' otherwise.
     *
     * Used by Kubernetes readiness probes to determine if the service
     * should receive traffic.
     */
    getReadinessStatus(): Promise<ReadinessResponse>;
    /**
     * Get liveness status.
     * Always returns 'ok' if the service is running.
     *
     * Used by Kubernetes liveness probes to determine if the service
     * needs to be restarted.
     */
    getLivenessStatus(): LivenessResponse;
    /**
     * Get basic health status.
     * Returns status, timestamp, and uptime.
     *
     * Used for simple health checks and monitoring.
     */
    getBasicHealth(): BasicHealthResponse;
}
export {};
