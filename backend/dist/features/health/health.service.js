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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthService = void 0;
const tsyringe_1 = require("tsyringe");
const typeorm_1 = require("typeorm");
const ioredis_1 = __importDefault(require("ioredis"));
const logger_config_1 = require("@config/logger.config");
/**
 * Health check timeout in milliseconds.
 * Keeps health checks fast to avoid blocking monitoring tools.
 */
const HEALTH_CHECK_TIMEOUT_MS = 3000;
/**
 * HealthService provides health check capabilities for the application.
 *
 * Three types of health checks are provided:
 * - Basic: Simple check that the service is running
 * - Liveness: Indicates the service is alive (for Kubernetes liveness probes)
 * - Readiness: Indicates the service can handle requests (checks dependencies)
 */
let HealthService = class HealthService {
    dataSource;
    redis;
    constructor(dataSource, redis) {
        this.dataSource = dataSource;
        this.redis = redis;
    }
    /**
     * Check database connectivity with timeout.
     * Uses a simple SELECT 1 query to verify the connection.
     */
    async checkDatabase() {
        try {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Database health check timeout')), HEALTH_CHECK_TIMEOUT_MS);
            });
            const queryPromise = this.dataSource.query('SELECT 1');
            await Promise.race([queryPromise, timeoutPromise]);
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_config_1.logger.warn('Database health check failed', { error: errorMessage });
            return false;
        }
    }
    /**
     * Check Redis connectivity with timeout.
     * Uses PING command to verify the connection.
     */
    async checkRedis() {
        try {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Redis health check timeout')), HEALTH_CHECK_TIMEOUT_MS);
            });
            const pingPromise = this.redis.ping();
            await Promise.race([pingPromise, timeoutPromise]);
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_config_1.logger.warn('Redis health check failed', { error: errorMessage });
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
    async getReadinessStatus() {
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
    getLivenessStatus() {
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
    getBasicHealth() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        };
    }
};
exports.HealthService = HealthService;
exports.HealthService = HealthService = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)('DataSource')),
    __param(1, (0, tsyringe_1.inject)('RedisClient')),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        ioredis_1.default])
], HealthService);
