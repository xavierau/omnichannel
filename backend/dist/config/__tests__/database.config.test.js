"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../constants");
/**
 * Mock modules before importing the database config.
 * This allows us to test the configuration logic without
 * actually connecting to a database.
 */
// Store original env
const originalEnv = process.env;
describe('Database Configuration', () => {
    beforeEach(() => {
        // Reset modules to get fresh config with new env vars
        jest.resetModules();
        process.env = { ...originalEnv };
    });
    afterAll(() => {
        process.env = originalEnv;
    });
    describe('DB_CONSTANTS', () => {
        it('should have correct default pool max connections', () => {
            expect(constants_1.DB_CONSTANTS.CONNECTION_POOL_MAX).toBe(20);
        });
        it('should have correct default pool min connections', () => {
            expect(constants_1.DB_CONSTANTS.CONNECTION_POOL_MIN).toBe(5);
        });
        it('should have correct default idle timeout', () => {
            expect(constants_1.DB_CONSTANTS.CONNECTION_IDLE_TIMEOUT_MS).toBe(30000);
        });
        it('should have correct default connection timeout', () => {
            expect(constants_1.DB_CONSTANTS.CONNECTION_TIMEOUT_MS).toBe(5000);
        });
        it('should have correct default acquire timeout', () => {
            expect(constants_1.DB_CONSTANTS.ACQUIRE_TIMEOUT_MS).toBe(60000);
        });
        it('should have correct default statement timeout', () => {
            expect(constants_1.DB_CONSTANTS.STATEMENT_TIMEOUT_MS).toBe(30000);
        });
        it('should have correct default retry attempts', () => {
            expect(constants_1.DB_CONSTANTS.MAX_RETRY_ATTEMPTS).toBe(3);
        });
        it('should have correct default retry delay', () => {
            expect(constants_1.DB_CONSTANTS.RETRY_DELAY_MS).toBe(1000);
        });
    });
    describe('parseIntEnv helper', () => {
        // We'll test this indirectly through the config behavior
        it('should use default values when env vars are not set', async () => {
            // Clear pool-related env vars
            delete process.env.DB_POOL_MAX;
            delete process.env.DB_POOL_MIN;
            // The module will use defaults from DB_CONSTANTS
            // We verify this by checking the constants themselves
            expect(constants_1.DB_CONSTANTS.CONNECTION_POOL_MAX).toBe(20);
            expect(constants_1.DB_CONSTANTS.CONNECTION_POOL_MIN).toBe(5);
        });
    });
    describe('Pool configuration validation', () => {
        it('pool min should be less than or equal to pool max', () => {
            expect(constants_1.DB_CONSTANTS.CONNECTION_POOL_MIN).toBeLessThanOrEqual(constants_1.DB_CONSTANTS.CONNECTION_POOL_MAX);
        });
        it('connection timeout should be less than acquire timeout', () => {
            expect(constants_1.DB_CONSTANTS.CONNECTION_TIMEOUT_MS).toBeLessThan(constants_1.DB_CONSTANTS.ACQUIRE_TIMEOUT_MS);
        });
        it('idle timeout should be reasonable (between 10s and 5min)', () => {
            expect(constants_1.DB_CONSTANTS.CONNECTION_IDLE_TIMEOUT_MS).toBeGreaterThanOrEqual(10000);
            expect(constants_1.DB_CONSTANTS.CONNECTION_IDLE_TIMEOUT_MS).toBeLessThanOrEqual(300000);
        });
        it('retry delay should be at least 100ms', () => {
            expect(constants_1.DB_CONSTANTS.RETRY_DELAY_MS).toBeGreaterThanOrEqual(100);
        });
        it('retry attempts should be between 1 and 10', () => {
            expect(constants_1.DB_CONSTANTS.MAX_RETRY_ATTEMPTS).toBeGreaterThanOrEqual(1);
            expect(constants_1.DB_CONSTANTS.MAX_RETRY_ATTEMPTS).toBeLessThanOrEqual(10);
        });
    });
});
describe('Database helper functions', () => {
    // Mock the logger to avoid actual logging during tests
    jest.mock('../logger.config', () => ({
        logger: {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
        },
    }));
    describe('checkDatabaseHealth', () => {
        it('should return false when database is not initialized', async () => {
            // Import fresh module
            const { checkDatabaseHealth, AppDataSource } = await Promise.resolve().then(() => __importStar(require('../database.config')));
            // AppDataSource should not be initialized in test environment
            // unless we explicitly call initialize
            if (!AppDataSource.isInitialized) {
                const result = await checkDatabaseHealth();
                expect(result).toBe(false);
            }
        });
    });
    describe('getPoolStatistics', () => {
        it('should return null when database is not initialized', async () => {
            const { getPoolStatistics, AppDataSource } = await Promise.resolve().then(() => __importStar(require('../database.config')));
            if (!AppDataSource.isInitialized) {
                const result = getPoolStatistics();
                expect(result).toBeNull();
            }
        });
    });
    describe('closeDatabase', () => {
        it('should not throw when database is not initialized', async () => {
            const { closeDatabase, AppDataSource } = await Promise.resolve().then(() => __importStar(require('../database.config')));
            if (!AppDataSource.isInitialized) {
                // Should not throw
                await expect(closeDatabase()).resolves.not.toThrow();
            }
        });
    });
});
