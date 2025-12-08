"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const messaging_window_service_1 = require("../messaging-window.service");
describe('MessagingWindowService', () => {
    let service;
    beforeEach(() => {
        service = new messaging_window_service_1.MessagingWindowService();
    });
    describe('isWindowOpen', () => {
        it('should return false when lastCustomerMessageAt is null', () => {
            const result = service.isWindowOpen(null);
            expect(result).toBe(false);
        });
        it('should return true when within 24 hours of last customer message', () => {
            // Customer message sent 1 hour ago
            const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
            const result = service.isWindowOpen(oneHourAgo);
            expect(result).toBe(true);
        });
        it('should return true when exactly at 23 hours 59 minutes', () => {
            // Customer message sent 23 hours and 59 minutes ago
            const almostExpired = new Date(Date.now() - (23 * 60 + 59) * 60 * 1000);
            const result = service.isWindowOpen(almostExpired);
            expect(result).toBe(true);
        });
        it('should return false when exactly 24 hours have passed', () => {
            // Customer message sent exactly 24 hours ago
            const exactly24HoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const result = service.isWindowOpen(exactly24HoursAgo);
            expect(result).toBe(false);
        });
        it('should return false when more than 24 hours have passed', () => {
            // Customer message sent 25 hours ago
            const over24HoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
            const result = service.isWindowOpen(over24HoursAgo);
            expect(result).toBe(false);
        });
        it('should return false when message is from days ago', () => {
            // Customer message sent 3 days ago
            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
            const result = service.isWindowOpen(threeDaysAgo);
            expect(result).toBe(false);
        });
        it('should return true when message was just sent (0 time difference)', () => {
            const justNow = new Date();
            const result = service.isWindowOpen(justNow);
            expect(result).toBe(true);
        });
    });
    describe('getWindowExpiry', () => {
        it('should return exactly 24 hours after lastCustomerMessageAt', () => {
            const messageTime = new Date('2024-01-15T10:00:00Z');
            const result = service.getWindowExpiry(messageTime);
            const expected = new Date('2024-01-16T10:00:00Z');
            expect(result.getTime()).toBe(expected.getTime());
        });
        it('should handle end-of-month date transitions', () => {
            const messageTime = new Date('2024-01-31T23:00:00Z');
            const result = service.getWindowExpiry(messageTime);
            const expected = new Date('2024-02-01T23:00:00Z');
            expect(result.getTime()).toBe(expected.getTime());
        });
        it('should handle end-of-year date transitions', () => {
            const messageTime = new Date('2024-12-31T12:00:00Z');
            const result = service.getWindowExpiry(messageTime);
            const expected = new Date('2025-01-01T12:00:00Z');
            expect(result.getTime()).toBe(expected.getTime());
        });
    });
    describe('getTimeRemaining', () => {
        it('should return null when lastCustomerMessageAt is null', () => {
            const result = service.getTimeRemaining(null);
            expect(result).toBeNull();
        });
        it('should return 0 when window has expired', () => {
            // Customer message sent 25 hours ago
            const over24HoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
            const result = service.getTimeRemaining(over24HoursAgo);
            expect(result).toBe(0);
        });
        it('should return 0 when exactly 24 hours have passed', () => {
            const exactly24HoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const result = service.getTimeRemaining(exactly24HoursAgo);
            expect(result).toBe(0);
        });
        it('should return approximately 24 hours when message just received', () => {
            const justNow = new Date();
            const result = service.getTimeRemaining(justNow);
            // Should be approximately 24 hours in milliseconds (allow 1 second tolerance)
            const twentyFourHoursMs = 24 * 60 * 60 * 1000;
            expect(result).toBeGreaterThan(twentyFourHoursMs - 1000);
            expect(result).toBeLessThanOrEqual(twentyFourHoursMs);
        });
        it('should return correct remaining time for partial window', () => {
            // Customer message sent 12 hours ago - should have 12 hours remaining
            const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
            const result = service.getTimeRemaining(twelveHoursAgo);
            // Should be approximately 12 hours in milliseconds (allow 1 second tolerance)
            const twelveHoursMs = 12 * 60 * 60 * 1000;
            expect(result).toBeGreaterThan(twelveHoursMs - 1000);
            expect(result).toBeLessThanOrEqual(twelveHoursMs);
        });
        it('should return correct remaining time for 1 hour remaining', () => {
            // Customer message sent 23 hours ago - should have 1 hour remaining
            const twentyThreeHoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000);
            const result = service.getTimeRemaining(twentyThreeHoursAgo);
            // Should be approximately 1 hour in milliseconds (allow 1 second tolerance)
            const oneHourMs = 1 * 60 * 60 * 1000;
            expect(result).toBeGreaterThan(oneHourMs - 1000);
            expect(result).toBeLessThanOrEqual(oneHourMs);
        });
    });
    describe('WINDOW_HOURS constant', () => {
        it('should use 24-hour window as per WhatsApp Cloud API specification', () => {
            // Verify the service uses exactly 24 hours
            // This test documents the business requirement from WhatsApp
            const messageTime = new Date();
            const expiry = service.getWindowExpiry(messageTime);
            const windowDurationMs = expiry.getTime() - messageTime.getTime();
            const windowDurationHours = windowDurationMs / (60 * 60 * 1000);
            expect(windowDurationHours).toBe(24);
        });
    });
});
