import { Router } from 'express';
import { container } from 'tsyringe';
import { HealthController } from './health.controller';

/**
 * Creates and returns health check routes.
 *
 * All routes are public (no authentication required) to allow
 * external monitoring tools, load balancers, and Kubernetes
 * to check health without credentials.
 *
 * Routes:
 * - GET /health - Basic health check with uptime
 * - GET /health/live - Liveness probe for Kubernetes
 * - GET /health/ready - Readiness probe with dependency checks
 */
export function createHealthRoutes(): Router {
  const router = Router();
  const controller = container.resolve(HealthController);

  /**
   * GET /health
   * Basic health check endpoint.
   * Returns: { status: 'ok', timestamp: Date, uptime: number }
   */
  router.get('/', controller.getHealth);

  /**
   * GET /health/live
   * Liveness probe for Kubernetes.
   * Always returns 200 if the service is running.
   * Returns: { status: 'ok', timestamp: Date }
   */
  router.get('/live', controller.getLive);

  /**
   * GET /health/ready
   * Readiness probe for Kubernetes.
   * Checks database and Redis connectivity.
   * Returns 200 if all healthy, 503 if degraded.
   * Returns: {
   *   status: 'ok' | 'degraded',
   *   timestamp: Date,
   *   checks: { database: 'ok'|'error', redis: 'ok'|'error' }
   * }
   */
  router.get('/ready', controller.getReady);

  return router;
}

export default createHealthRoutes;
