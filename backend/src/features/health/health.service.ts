import { inject, singleton } from 'tsyringe';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { logger } from '@config/logger.config';

/**
 * Health check timeout in milliseconds.
 * Keeps health checks fast to avoid blocking monitoring tools.
 */
const HEALTH_CHECK_TIMEOUT_MS = 3000;

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
@singleton()
export class HealthService {
  constructor(
    @inject('DataSource') private dataSource: DataSource,
    @inject('RedisClient') private redis: Redis
  ) {}

  /**
   * Check database connectivity with timeout.
   * Uses a simple SELECT 1 query to verify the connection.
   */
  async checkDatabase(): Promise<boolean> {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Database health check timeout')), HEALTH_CHECK_TIMEOUT_MS);
      });

      const queryPromise = this.dataSource.query('SELECT 1');

      await Promise.race([queryPromise, timeoutPromise]);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('Database health check failed', { error: errorMessage });
      return false;
    }
  }

  /**
   * Check Redis connectivity with timeout.
   * Uses PING command to verify the connection.
   */
  async checkRedis(): Promise<boolean> {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Redis health check timeout')), HEALTH_CHECK_TIMEOUT_MS);
      });

      const pingPromise = this.redis.ping();

      await Promise.race([pingPromise, timeoutPromise]);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('Redis health check failed', { error: errorMessage });
      return false;
    }
  }

  /**
   * Get readiness status by checking all dependencies.
   * Returns 'ok' only if all dependencies are healthy, 'degraded' otherwise.
   *
   * Used by Kubernetes readiness probes to determine if the service
   * should receive traffic.
   */
  async getReadinessStatus(): Promise<ReadinessResponse> {
    const [databaseHealthy, redisHealthy] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const allHealthy = databaseHealthy && redisHealthy;

    return {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: databaseHealthy ? 'ok' : 'error',
        redis: redisHealthy ? 'ok' : 'error',
      },
    };
  }

  /**
   * Get liveness status.
   * Always returns 'ok' if the service is running.
   *
   * Used by Kubernetes liveness probes to determine if the service
   * needs to be restarted.
   */
  getLivenessStatus(): LivenessResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get basic health status.
   * Returns status, timestamp, and uptime.
   *
   * Used for simple health checks and monitoring.
   */
  getBasicHealth(): BasicHealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
