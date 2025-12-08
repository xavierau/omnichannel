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
require("reflect-metadata");
// Mock Bull before any imports
const mockQueue = {
    process: jest.fn(),
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
    getJob: jest.fn(),
    getJobs: jest.fn(),
    removeJobs: jest.fn(),
};
const MockBull = jest.fn(() => mockQueue);
jest.mock('bull', () => MockBull);
describe('Bull Configuration', () => {
    const originalEnv = process.env;
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        process.env = { ...originalEnv };
    });
    afterEach(() => {
        process.env = originalEnv;
    });
    describe('BULL_CONFIG', () => {
        it('should use default Redis URL when BULL_REDIS_URL is not set', async () => {
            delete process.env.BULL_REDIS_URL;
            const { BULL_CONFIG } = await Promise.resolve().then(() => __importStar(require('../bull.config')));
            expect(BULL_CONFIG.redis).toBe('redis://localhost:6379');
        });
        it('should use BULL_REDIS_URL from environment when set', async () => {
            process.env.BULL_REDIS_URL = 'redis://custom-host:6380';
            const { BULL_CONFIG } = await Promise.resolve().then(() => __importStar(require('../bull.config')));
            expect(BULL_CONFIG.redis).toBe('redis://custom-host:6380');
        });
        it('should use default concurrency when BULL_CONCURRENCY is not set', async () => {
            delete process.env.BULL_CONCURRENCY;
            const { BULL_CONFIG } = await Promise.resolve().then(() => __importStar(require('../bull.config')));
            expect(BULL_CONFIG.concurrency).toBe(5);
        });
        it('should use BULL_CONCURRENCY from environment when set', async () => {
            process.env.BULL_CONCURRENCY = '10';
            const { BULL_CONFIG } = await Promise.resolve().then(() => __importStar(require('../bull.config')));
            expect(BULL_CONFIG.concurrency).toBe(10);
        });
        it('should have default job options with retry settings', async () => {
            const { BULL_CONFIG } = await Promise.resolve().then(() => __importStar(require('../bull.config')));
            expect(BULL_CONFIG.defaultJobOptions).toEqual({
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
                removeOnComplete: 100,
                removeOnFail: 100,
            });
        });
    });
    describe('createQueue', () => {
        it('should create a Bull queue with the given name', async () => {
            const { createQueue, BULL_CONFIG } = await Promise.resolve().then(() => __importStar(require('../bull.config')));
            const queue = createQueue('test-queue');
            expect(MockBull).toHaveBeenCalledWith('test-queue', BULL_CONFIG.redis, {
                defaultJobOptions: BULL_CONFIG.defaultJobOptions,
            });
            expect(queue).toBeDefined();
        });
        it('should create multiple independent queues', async () => {
            const { createQueue } = await Promise.resolve().then(() => __importStar(require('../bull.config')));
            const queue1 = createQueue('queue-1');
            const queue2 = createQueue('queue-2');
            expect(MockBull).toHaveBeenCalledTimes(2);
            expect(queue1).toBeDefined();
            expect(queue2).toBeDefined();
        });
    });
});
