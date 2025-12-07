import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { HealthService } from './health.service';
import { asyncHandler } from '@middleware/async-handler';

/**
 * HTTP status codes for health check responses.
 */
const HTTP_STATUS = {
  OK: 200,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * HealthController handles health check endpoints.
 *
 * All endpoints are public (no authentication required) to allow
 * external monitoring tools and load balancers to check health.
 */
@singleton()
export class HealthController {
  constructor(@inject(HealthService) private healthService: HealthService) {}

  /**
   * GET /health
   * Basic health check endpoint.
   * Returns status, timestamp, and uptime.
   * Always returns 200 if the service is running.
   */
  getHealth = asyncHandler(async (_req: Request, res: Response) => {
    const health = this.healthService.getBasicHealth();
    res.status(HTTP_STATUS.OK).json(health);
  });

  /**
   * GET /health/live
   * Liveness probe endpoint.
   * Returns 200 if the service is alive.
   *
   * Used by Kubernetes liveness probes.
   * If this fails, Kubernetes will restart the pod.
   */
  getLive = asyncHandler(async (_req: Request, res: Response) => {
    const liveness = this.healthService.getLivenessStatus();
    res.status(HTTP_STATUS.OK).json(liveness);
  });

  /**
   * GET /health/ready
   * Readiness probe endpoint.
   * Returns 200 if all dependencies are healthy, 503 otherwise.
   *
   * Used by Kubernetes readiness probes.
   * If this fails, Kubernetes will stop routing traffic to the pod.
   */
  getReady = asyncHandler(async (_req: Request, res: Response) => {
    const readiness = await this.healthService.getReadinessStatus();

    const statusCode = readiness.status === 'ok'
      ? HTTP_STATUS.OK
      : HTTP_STATUS.SERVICE_UNAVAILABLE;

    res.status(statusCode).json(readiness);
  });
}
