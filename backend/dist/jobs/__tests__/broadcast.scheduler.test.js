"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const broadcast_scheduler_1 = require("../broadcast.scheduler");
// Mock logger
jest.mock('../../config/logger.config', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
    auditLogger: {
        info: jest.fn(),
    },
}));
describe('BroadcastScheduler', () => {
    let scheduler;
    let mockBroadcastQueue;
    beforeEach(() => {
        jest.useFakeTimers();
        mockBroadcastQueue = {
            checkScheduledBroadcasts: jest.fn().mockResolvedValue(undefined),
            closeQueue: jest.fn().mockResolvedValue(undefined),
        };
        scheduler = new broadcast_scheduler_1.BroadcastScheduler(mockBroadcastQueue);
    });
    afterEach(() => {
        scheduler.stop();
        jest.useRealTimers();
        jest.clearAllMocks();
    });
    describe('start', () => {
        it('should start checking for scheduled broadcasts at the specified interval', async () => {
            scheduler.start(5000); // Check every 5 seconds
            // Advance time by 5 seconds
            jest.advanceTimersByTime(5000);
            await Promise.resolve(); // Let promises resolve
            expect(mockBroadcastQueue.checkScheduledBroadcasts).toHaveBeenCalledTimes(1);
            // Advance time by another 5 seconds
            jest.advanceTimersByTime(5000);
            await Promise.resolve();
            expect(mockBroadcastQueue.checkScheduledBroadcasts).toHaveBeenCalledTimes(2);
        });
        it('should use default interval of 60 seconds when not specified', async () => {
            scheduler.start();
            // Should not be called until 60 seconds
            jest.advanceTimersByTime(59000);
            await Promise.resolve();
            expect(mockBroadcastQueue.checkScheduledBroadcasts).not.toHaveBeenCalled();
            // Should be called after 60 seconds
            jest.advanceTimersByTime(1000);
            await Promise.resolve();
            expect(mockBroadcastQueue.checkScheduledBroadcasts).toHaveBeenCalledTimes(1);
        });
        it('should not start multiple intervals when called multiple times', async () => {
            scheduler.start(5000);
            scheduler.start(5000);
            scheduler.start(5000);
            jest.advanceTimersByTime(5000);
            await Promise.resolve();
            // Should only be called once, not three times
            expect(mockBroadcastQueue.checkScheduledBroadcasts).toHaveBeenCalledTimes(1);
        });
    });
    describe('stop', () => {
        it('should stop checking for scheduled broadcasts', async () => {
            scheduler.start(5000);
            jest.advanceTimersByTime(5000);
            await Promise.resolve();
            expect(mockBroadcastQueue.checkScheduledBroadcasts).toHaveBeenCalledTimes(1);
            scheduler.stop();
            jest.advanceTimersByTime(5000);
            await Promise.resolve();
            // Should still be 1, not 2
            expect(mockBroadcastQueue.checkScheduledBroadcasts).toHaveBeenCalledTimes(1);
        });
        it('should handle being called when not started', () => {
            expect(() => scheduler.stop()).not.toThrow();
        });
        it('should handle being called multiple times', () => {
            scheduler.start(5000);
            expect(() => {
                scheduler.stop();
                scheduler.stop();
                scheduler.stop();
            }).not.toThrow();
        });
    });
    describe('isRunning', () => {
        it('should return false when not started', () => {
            expect(scheduler.isRunning()).toBe(false);
        });
        it('should return true when started', () => {
            scheduler.start(5000);
            expect(scheduler.isRunning()).toBe(true);
        });
        it('should return false after being stopped', () => {
            scheduler.start(5000);
            scheduler.stop();
            expect(scheduler.isRunning()).toBe(false);
        });
    });
    describe('error handling', () => {
        it('should continue running even if checkScheduledBroadcasts throws', async () => {
            mockBroadcastQueue.checkScheduledBroadcasts
                .mockRejectedValueOnce(new Error('Database error'))
                .mockResolvedValueOnce(undefined);
            scheduler.start(5000);
            // First tick - should throw but not crash
            jest.advanceTimersByTime(5000);
            await Promise.resolve();
            await Promise.resolve(); // Extra tick for error handling
            expect(mockBroadcastQueue.checkScheduledBroadcasts).toHaveBeenCalledTimes(1);
            // Second tick - should still work
            jest.advanceTimersByTime(5000);
            await Promise.resolve();
            expect(mockBroadcastQueue.checkScheduledBroadcasts).toHaveBeenCalledTimes(2);
            expect(scheduler.isRunning()).toBe(true);
        });
    });
    describe('restart', () => {
        it('should allow restarting after stopping', async () => {
            scheduler.start(5000);
            jest.advanceTimersByTime(5000);
            await Promise.resolve();
            expect(mockBroadcastQueue.checkScheduledBroadcasts).toHaveBeenCalledTimes(1);
            scheduler.stop();
            scheduler.start(5000);
            jest.advanceTimersByTime(5000);
            await Promise.resolve();
            expect(mockBroadcastQueue.checkScheduledBroadcasts).toHaveBeenCalledTimes(2);
        });
        it('should allow restarting with a different interval', async () => {
            scheduler.start(5000);
            jest.advanceTimersByTime(5000);
            await Promise.resolve();
            expect(mockBroadcastQueue.checkScheduledBroadcasts).toHaveBeenCalledTimes(1);
            scheduler.stop();
            scheduler.start(10000); // Different interval
            jest.advanceTimersByTime(5000);
            await Promise.resolve();
            expect(mockBroadcastQueue.checkScheduledBroadcasts).toHaveBeenCalledTimes(1);
            jest.advanceTimersByTime(5000);
            await Promise.resolve();
            expect(mockBroadcastQueue.checkScheduledBroadcasts).toHaveBeenCalledTimes(2);
        });
    });
});
