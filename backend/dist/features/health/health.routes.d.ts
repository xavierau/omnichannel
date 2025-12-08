import { Router } from 'express';
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
export declare function createHealthRoutes(): Router;
export default createHealthRoutes;
