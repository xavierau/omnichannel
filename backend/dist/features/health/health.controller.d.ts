import { Request, Response } from 'express';
import { HealthService } from './health.service';
/**
 * HealthController handles health check endpoints.
 *
 * All endpoints are public (no authentication required) to allow
 * external monitoring tools and load balancers to check health.
 */
export declare class HealthController {
    private healthService;
    constructor(healthService: HealthService);
    /**
     * GET /health
     * Basic health check endpoint.
     * Returns status, timestamp, and uptime.
     * Always returns 200 if the service is running.
     */
    getHealth: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * GET /health/live
     * Liveness probe endpoint.
     * Returns 200 if the service is alive.
     *
     * Used by Kubernetes liveness probes.
     * If this fails, Kubernetes will restart the pod.
     */
    getLive: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * GET /health/ready
     * Readiness probe endpoint.
     * Returns 200 if all dependencies are healthy, 503 otherwise.
     *
     * Used by Kubernetes readiness probes.
     * If this fails, Kubernetes will stop routing traffic to the pod.
     */
    getReady: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
