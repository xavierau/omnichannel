"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const broadcast_sse_service_1 = require("../broadcast-sse.service");
const enums_1 = require("../enums");
// Mock the logger
jest.mock('../../../config/logger.config', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));
describe('BroadcastSseService', () => {
    let sseService;
    let mockResponse;
    const testUserId = 'user-1';
    const createMockResponse = () => {
        return {
            setHeader: jest.fn(),
            flushHeaders: jest.fn(),
            write: jest.fn(),
            end: jest.fn(),
            on: jest.fn().mockReturnThis(),
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            headersSent: false,
            writableEnded: false,
        };
    };
    const createProgressEvent = (overrides = {}) => ({
        broadcastId: 'broadcast-1',
        status: enums_1.BroadcastStatus.SENDING,
        sentCount: 50,
        deliveredCount: 45,
        readCount: 20,
        failedCount: 5,
        totalRecipients: 100,
        ...overrides,
    });
    beforeEach(() => {
        jest.useFakeTimers();
        sseService = new broadcast_sse_service_1.BroadcastSseService();
        mockResponse = createMockResponse();
    });
    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });
    describe('addClient', () => {
        it('should set correct SSE headers', () => {
            sseService.addClient('broadcast-1', testUserId, mockResponse);
            expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
            expect(mockResponse.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
            expect(mockResponse.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Accel-Buffering', 'no');
            expect(mockResponse.flushHeaders).toHaveBeenCalled();
        });
        it('should register client for broadcast', () => {
            sseService.addClient('broadcast-1', testUserId, mockResponse);
            expect(sseService.getClientCount('broadcast-1')).toBe(1);
        });
        it('should register multiple clients for same broadcast', () => {
            const mockResponse2 = createMockResponse();
            sseService.addClient('broadcast-1', 'user-1', mockResponse);
            sseService.addClient('broadcast-1', 'user-2', mockResponse2);
            expect(sseService.getClientCount('broadcast-1')).toBe(2);
        });
        it('should set up disconnect handler', () => {
            sseService.addClient('broadcast-1', testUserId, mockResponse);
            expect(mockResponse.on).toHaveBeenCalledWith('close', expect.any(Function));
        });
        it('should remove client on disconnect', () => {
            let closeHandler = () => { };
            mockResponse.on.mockImplementation((event, handler) => {
                if (event === 'close') {
                    closeHandler = handler;
                }
                return mockResponse;
            });
            sseService.addClient('broadcast-1', testUserId, mockResponse);
            expect(sseService.getClientCount('broadcast-1')).toBe(1);
            // Simulate disconnect
            closeHandler();
            expect(sseService.getClientCount('broadcast-1')).toBe(0);
        });
        it('should return true when connection is accepted', () => {
            const result = sseService.addClient('broadcast-1', testUserId, mockResponse);
            expect(result).toBe(true);
        });
    });
    describe('sendHeartbeat', () => {
        it('should send heartbeat event with timestamp', () => {
            sseService.sendHeartbeat(mockResponse);
            expect(mockResponse.write).toHaveBeenCalledWith('event: heartbeat\n');
            expect(mockResponse.write).toHaveBeenCalledWith(expect.stringContaining('data: {"timestamp":'));
        });
        it('should not send heartbeat if response is ended', () => {
            mockResponse.writableEnded = true;
            sseService.sendHeartbeat(mockResponse);
            expect(mockResponse.write).not.toHaveBeenCalled();
        });
        it('should send heartbeat every 30 seconds', () => {
            sseService.addClient('broadcast-1', testUserId, mockResponse);
            // Clear initial calls
            mockResponse.write.mockClear();
            // Advance timer by 30 seconds
            jest.advanceTimersByTime(30000);
            expect(mockResponse.write).toHaveBeenCalledWith('event: heartbeat\n');
        });
    });
    describe('sendInitialState', () => {
        it('should send progress and status events', () => {
            const event = createProgressEvent();
            sseService.sendInitialState(mockResponse, event);
            expect(mockResponse.write).toHaveBeenCalledWith('event: progress\n');
            expect(mockResponse.write).toHaveBeenCalledWith(expect.stringContaining('"broadcastId":"broadcast-1"'));
            expect(mockResponse.write).toHaveBeenCalledWith('event: status\n');
            expect(mockResponse.write).toHaveBeenCalledWith(expect.stringContaining('"status":"sending"'));
        });
        it('should not send if response is ended', () => {
            mockResponse.writableEnded = true;
            const event = createProgressEvent();
            sseService.sendInitialState(mockResponse, event);
            expect(mockResponse.write).not.toHaveBeenCalled();
        });
    });
    describe('emitProgress', () => {
        it('should emit progress to subscribed clients', () => {
            sseService.addClient('broadcast-1', testUserId, mockResponse);
            // Clear initial setup calls
            mockResponse.write.mockClear();
            const event = createProgressEvent();
            sseService.emitProgress(event);
            // Should receive both progress and status events
            expect(mockResponse.write).toHaveBeenCalledWith('event: progress\n');
            expect(mockResponse.write).toHaveBeenCalledWith('event: status\n');
        });
        it('should not emit to clients for different broadcast', () => {
            sseService.addClient('broadcast-2', testUserId, mockResponse);
            mockResponse.write.mockClear();
            const event = createProgressEvent({ broadcastId: 'broadcast-1' });
            sseService.emitProgress(event);
            // Should only receive status from addClient, not from emitProgress
            expect(mockResponse.write).not.toHaveBeenCalled();
        });
        it('should send completed event when status is COMPLETED', () => {
            sseService.addClient('broadcast-1', testUserId, mockResponse);
            mockResponse.write.mockClear();
            const event = createProgressEvent({
                status: enums_1.BroadcastStatus.COMPLETED,
                completedAt: new Date(),
            });
            sseService.emitProgress(event);
            expect(mockResponse.write).toHaveBeenCalledWith('event: completed\n');
        });
        it('should emit to multiple clients', () => {
            const mockResponse2 = createMockResponse();
            sseService.addClient('broadcast-1', 'user-1', mockResponse);
            sseService.addClient('broadcast-1', 'user-2', mockResponse2);
            mockResponse.write.mockClear();
            mockResponse2.write.mockClear();
            const event = createProgressEvent();
            sseService.emitProgress(event);
            expect(mockResponse.write).toHaveBeenCalled();
            expect(mockResponse2.write).toHaveBeenCalled();
        });
    });
    describe('getClientCount', () => {
        it('should return 0 for unknown broadcast', () => {
            expect(sseService.getClientCount('unknown')).toBe(0);
        });
        it('should return correct count', () => {
            sseService.addClient('broadcast-1', testUserId, mockResponse);
            expect(sseService.getClientCount('broadcast-1')).toBe(1);
        });
        it('should return 0 after all clients disconnect', () => {
            let closeHandler = () => { };
            mockResponse.on.mockImplementation((event, handler) => {
                if (event === 'close') {
                    closeHandler = handler;
                }
                return mockResponse;
            });
            sseService.addClient('broadcast-1', testUserId, mockResponse);
            closeHandler();
            expect(sseService.getClientCount('broadcast-1')).toBe(0);
        });
    });
    describe('closeAllConnections', () => {
        it('should close all connections for a broadcast', () => {
            const mockResponse2 = createMockResponse();
            sseService.addClient('broadcast-1', 'user-1', mockResponse);
            sseService.addClient('broadcast-1', 'user-2', mockResponse2);
            expect(sseService.getClientCount('broadcast-1')).toBe(2);
            sseService.closeAllConnections('broadcast-1');
            expect(mockResponse.end).toHaveBeenCalled();
            expect(mockResponse2.end).toHaveBeenCalled();
            expect(sseService.getClientCount('broadcast-1')).toBe(0);
        });
        it('should not affect other broadcasts', () => {
            const mockResponse2 = createMockResponse();
            sseService.addClient('broadcast-1', 'user-1', mockResponse);
            sseService.addClient('broadcast-2', 'user-2', mockResponse2);
            sseService.closeAllConnections('broadcast-1');
            expect(mockResponse.end).toHaveBeenCalled();
            expect(mockResponse2.end).not.toHaveBeenCalled();
            expect(sseService.getClientCount('broadcast-1')).toBe(0);
            expect(sseService.getClientCount('broadcast-2')).toBe(1);
        });
        it('should handle non-existent broadcast gracefully', () => {
            expect(() => sseService.closeAllConnections('unknown')).not.toThrow();
        });
        it('should not call end if response already ended', () => {
            mockResponse.writableEnded = true;
            sseService.addClient('broadcast-1', testUserId, mockResponse);
            sseService.closeAllConnections('broadcast-1');
            expect(mockResponse.end).not.toHaveBeenCalled();
        });
    });
    describe('Event format', () => {
        it('should format SSE events correctly', () => {
            sseService.addClient('broadcast-1', testUserId, mockResponse);
            mockResponse.write.mockClear();
            const event = createProgressEvent();
            sseService.emitProgress(event);
            // Verify event format follows SSE spec: "event: <type>\ndata: <json>\n\n"
            const writeCalls = mockResponse.write.mock.calls.map(call => call[0]);
            // Find progress event
            const progressEventIndex = writeCalls.findIndex(call => call === 'event: progress\n');
            expect(progressEventIndex).toBeGreaterThanOrEqual(0);
            // Data should follow event type
            const dataCall = writeCalls[progressEventIndex + 1];
            expect(dataCall).toMatch(/^data: \{.*\}\n\n$/);
        });
    });
});
