"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const health_service_1 = require("../health.service");
// Mock the logger
jest.mock('../../../config/logger.config', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));
describe('HealthService', () => {
    let healthService;
    let mockDataSource;
    let mockRedis;
    beforeEach(() => {
        // Create mock DataSource
        mockDataSource = {
            query: jest.fn(),
            isInitialized: true,
        };
        // Create mock Redis client
        mockRedis = {
            ping: jest.fn(),
            status: 'ready',
        };
        // Create service instance with mocked dependencies
        healthService = new health_service_1.HealthService(mockDataSource, mockRedis);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('checkDatabase', () => {
        it('should return true when database is healthy', async () => {
            mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
            const result = await healthService.checkDatabase();
            expect(result).toBe(true);
            expect(mockDataSource.query).toHaveBeenCalledWith('SELECT 1');
        });
        it('should return false when database query fails', async () => {
            mockDataSource.query.mockRejectedValue(new Error('Connection refused'));
            const result = await healthService.checkDatabase();
            expect(result).toBe(false);
            expect(mockDataSource.query).toHaveBeenCalledWith('SELECT 1');
        });
        it('should return false when database is not initialized', async () => {
            mockDataSource.query.mockRejectedValue(new Error('DataSource is not initialized'));
            const result = await healthService.checkDatabase();
            expect(result).toBe(false);
        });
        it('should handle timeout errors gracefully', async () => {
            mockDataSource.query.mockRejectedValue(new Error('Query timeout'));
            const result = await healthService.checkDatabase();
            expect(result).toBe(false);
        });
    });
    describe('checkRedis', () => {
        it('should return true when Redis is healthy', async () => {
            mockRedis.ping.mockResolvedValue('PONG');
            const result = await healthService.checkRedis();
            expect(result).toBe(true);
            expect(mockRedis.ping).toHaveBeenCalled();
        });
        it('should return false when Redis ping fails', async () => {
            mockRedis.ping.mockRejectedValue(new Error('Connection refused'));
            const result = await healthService.checkRedis();
            expect(result).toBe(false);
            expect(mockRedis.ping).toHaveBeenCalled();
        });
        it('should return false when Redis connection is closed', async () => {
            mockRedis.ping.mockRejectedValue(new Error('Connection closed'));
            const result = await healthService.checkRedis();
            expect(result).toBe(false);
        });
        it('should handle timeout errors gracefully', async () => {
            mockRedis.ping.mockRejectedValue(new Error('ETIMEDOUT'));
            const result = await healthService.checkRedis();
            expect(result).toBe(false);
        });
    });
    describe('getReadinessStatus', () => {
        it('should return ok status when all dependencies are healthy', async () => {
            mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
            mockRedis.ping.mockResolvedValue('PONG');
            const result = await healthService.getReadinessStatus();
            expect(result.status).toBe('ok');
            expect(result.checks.database).toBe('ok');
            expect(result.checks.redis).toBe('ok');
        });
        it('should return degraded status when database is unhealthy', async () => {
            mockDataSource.query.mockRejectedValue(new Error('Connection refused'));
            mockRedis.ping.mockResolvedValue('PONG');
            const result = await healthService.getReadinessStatus();
            expect(result.status).toBe('degraded');
            expect(result.checks.database).toBe('error');
            expect(result.checks.redis).toBe('ok');
        });
        it('should return degraded status when Redis is unhealthy', async () => {
            mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
            mockRedis.ping.mockRejectedValue(new Error('Connection refused'));
            const result = await healthService.getReadinessStatus();
            expect(result.status).toBe('degraded');
            expect(result.checks.database).toBe('ok');
            expect(result.checks.redis).toBe('error');
        });
        it('should return degraded status when all dependencies are unhealthy', async () => {
            mockDataSource.query.mockRejectedValue(new Error('Database error'));
            mockRedis.ping.mockRejectedValue(new Error('Redis error'));
            const result = await healthService.getReadinessStatus();
            expect(result.status).toBe('degraded');
            expect(result.checks.database).toBe('error');
            expect(result.checks.redis).toBe('error');
        });
        it('should include timestamp in response', async () => {
            mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
            mockRedis.ping.mockResolvedValue('PONG');
            const before = new Date();
            const result = await healthService.getReadinessStatus();
            const after = new Date();
            expect(result.timestamp).toBeDefined();
            const timestamp = new Date(result.timestamp);
            expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
        });
    });
    describe('getLivenessStatus', () => {
        it('should return ok status', () => {
            const result = healthService.getLivenessStatus();
            expect(result.status).toBe('ok');
        });
        it('should include timestamp in response', () => {
            const before = new Date();
            const result = healthService.getLivenessStatus();
            const after = new Date();
            expect(result.timestamp).toBeDefined();
            const timestamp = new Date(result.timestamp);
            expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
        });
    });
    describe('getBasicHealth', () => {
        it('should return basic health status', () => {
            const result = healthService.getBasicHealth();
            expect(result.status).toBe('ok');
            expect(result.timestamp).toBeDefined();
        });
        it('should include uptime in response', () => {
            const result = healthService.getBasicHealth();
            expect(result.uptime).toBeDefined();
            expect(typeof result.uptime).toBe('number');
            expect(result.uptime).toBeGreaterThanOrEqual(0);
        });
    });
});
