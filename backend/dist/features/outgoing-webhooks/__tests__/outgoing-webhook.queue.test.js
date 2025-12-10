"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const outgoing_webhook_queue_1 = require("../../../jobs/outgoing-webhook.queue");
// Mock logger
jest.mock('../../../config/logger.config', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
    auditLogger: {
        info: jest.fn(),
    },
}));
// Mock bull config
jest.mock('../../../config/bull.config', () => ({
    createQueue: jest.fn(() => ({
        add: jest.fn().mockResolvedValue({ id: 'job-123' }),
        process: jest.fn(),
        on: jest.fn(),
        getJobCounts: jest.fn().mockResolvedValue({
            waiting: 0,
            active: 0,
            completed: 0,
            failed: 0,
            delayed: 0,
            paused: 0,
        }),
        pause: jest.fn().mockResolvedValue(undefined),
        resume: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
    })),
    BULL_CONFIG: {
        concurrency: 5,
    },
}));
describe('OutgoingWebhookQueue', () => {
    let queue;
    let mockDispatcher;
    let mockBullQueue;
    const createMockPayload = (overrides = {}) => ({
        event: 'message.received.unassigned',
        timestamp: '2024-01-15T10:30:00.000Z',
        message: {
            id: 'msg-123',
            providerMessageId: 'wamid.abc123',
            contentType: 'text',
            content: { body: 'Hello' },
            receivedAt: '2024-01-15T10:30:00.000Z',
        },
        conversation: {
            id: 'conv-456',
            status: 'unassigned',
            createdAt: '2024-01-15T10:00:00.000Z',
            lastMessageAt: '2024-01-15T10:30:00.000Z',
        },
        customer: {
            id: 'cust-789',
            name: 'John Doe',
            whatsappNumber: '+85291234567',
            customFields: {},
        },
        channelAccount: {
            id: 'ca-001',
            name: 'Support Line',
            phoneNumber: '+1234567890',
        },
        tenantId: 'tenant-123',
        ...overrides,
    });
    const createMockJobData = (overrides = {}) => ({
        webhookUrl: 'https://example.com/webhook',
        payload: createMockPayload(),
        secretEncrypted: 'encrypted-secret',
        secretIv: 'iv-value',
        channelAccountId: 'ca-001',
        tenantId: 'tenant-123',
        ...overrides,
    });
    beforeEach(() => {
        jest.clearAllMocks();
        mockDispatcher = {
            dispatch: jest.fn().mockResolvedValue({ success: true, statusCode: 200 }),
        };
        queue = new outgoing_webhook_queue_1.OutgoingWebhookQueue(mockDispatcher);
        mockBullQueue = queue.getQueue();
    });
    describe('queueDispatch', () => {
        it('should add job to queue with correct options', async () => {
            const jobData = createMockJobData();
            const jobId = await queue.queueDispatch(jobData);
            expect(jobId).toBe('job-123');
            expect(mockBullQueue.add).toHaveBeenCalledWith(outgoing_webhook_queue_1.OutgoingWebhookJobType.DISPATCH_WEBHOOK, jobData, expect.objectContaining({
                attempts: 5,
                backoff: {
                    type: 'exponential',
                    delay: 5000,
                },
                removeOnComplete: 100,
                removeOnFail: 100,
                jobId: 'webhook:ca-001:msg-123',
            }));
        });
        it('should use message ID and channel account ID for job idempotency', async () => {
            const jobData = createMockJobData({
                channelAccountId: 'ca-999',
                payload: createMockPayload({
                    message: {
                        id: 'msg-unique',
                        providerMessageId: 'wamid.unique',
                        contentType: 'text',
                        content: {},
                        receivedAt: '2024-01-15T10:30:00.000Z',
                    },
                }),
            });
            await queue.queueDispatch(jobData);
            expect(mockBullQueue.add).toHaveBeenCalledWith(expect.any(String), expect.any(Object), expect.objectContaining({
                jobId: 'webhook:ca-999:msg-unique',
            }));
        });
    });
    describe('getQueueStats', () => {
        it('should return queue statistics', async () => {
            mockBullQueue.getJobCounts.mockResolvedValue({
                waiting: 5,
                active: 2,
                completed: 100,
                failed: 3,
                delayed: 1,
                paused: 0,
            });
            const stats = await queue.getQueueStats();
            expect(stats).toEqual({
                waiting: 5,
                active: 2,
                completed: 100,
                failed: 3,
                delayed: 1,
                paused: 0,
            });
        });
        it('should handle missing counts with defaults', async () => {
            mockBullQueue.getJobCounts.mockResolvedValue({});
            const stats = await queue.getQueueStats();
            expect(stats).toEqual({
                waiting: 0,
                active: 0,
                completed: 0,
                failed: 0,
                delayed: 0,
                paused: 0,
            });
        });
    });
    describe('queue control', () => {
        it('should pause the queue', async () => {
            await queue.pauseQueue();
            expect(mockBullQueue.pause).toHaveBeenCalled();
        });
        it('should resume the queue', async () => {
            await queue.resumeQueue();
            expect(mockBullQueue.resume).toHaveBeenCalled();
        });
        it('should close the queue', async () => {
            await queue.closeQueue();
            expect(mockBullQueue.close).toHaveBeenCalled();
        });
    });
    describe('processor setup', () => {
        it('should register processor for DISPATCH_WEBHOOK job type', () => {
            expect(mockBullQueue.process).toHaveBeenCalledWith(outgoing_webhook_queue_1.OutgoingWebhookJobType.DISPATCH_WEBHOOK, expect.any(Function));
        });
    });
    describe('event listeners', () => {
        it('should register error listener', () => {
            expect(mockBullQueue.on).toHaveBeenCalledWith('error', expect.any(Function));
        });
        it('should register failed listener', () => {
            expect(mockBullQueue.on).toHaveBeenCalledWith('failed', expect.any(Function));
        });
        it('should register completed listener', () => {
            expect(mockBullQueue.on).toHaveBeenCalledWith('completed', expect.any(Function));
        });
        it('should register stalled listener', () => {
            expect(mockBullQueue.on).toHaveBeenCalledWith('stalled', expect.any(Function));
        });
    });
});
