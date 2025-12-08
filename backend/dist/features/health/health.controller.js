"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const tsyringe_1 = require("tsyringe");
const health_service_1 = require("./health.service");
const async_handler_1 = require("@middleware/async-handler");
/**
 * HTTP status codes for health check responses.
 */
const HTTP_STATUS = {
    OK: 200,
    SERVICE_UNAVAILABLE: 503,
};
/**
 * HealthController handles health check endpoints.
 *
 * All endpoints are public (no authentication required) to allow
 * external monitoring tools and load balancers to check health.
 */
let HealthController = class HealthController {
    healthService;
    constructor(healthService) {
        this.healthService = healthService;
    }
    /**
     * GET /health
     * Basic health check endpoint.
     * Returns status, timestamp, and uptime.
     * Always returns 200 if the service is running.
     */
    getHealth = (0, async_handler_1.asyncHandler)(async (_req, res) => {
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
    getLive = (0, async_handler_1.asyncHandler)(async (_req, res) => {
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
    getReady = (0, async_handler_1.asyncHandler)(async (_req, res) => {
        const readiness = await this.healthService.getReadinessStatus();
        const statusCode = readiness.status === 'ok'
            ? HTTP_STATUS.OK
            : HTTP_STATUS.SERVICE_UNAVAILABLE;
        res.status(statusCode).json(readiness);
    });
};
exports.HealthController = HealthController;
exports.HealthController = HealthController = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(health_service_1.HealthService)),
    __metadata("design:paramtypes", [health_service_1.HealthService])
], HealthController);
