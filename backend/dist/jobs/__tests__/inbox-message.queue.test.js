"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const inbox_message_queue_1 = require("../inbox-message.queue");
const enums_1 = require("../../features/inbox/enums");
const channel_account_entity_1 = require("../../features/channel-accounts/channel-account.entity");
// Mock Bull queue
const mockQueue = {
    process: jest.fn(),
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
    getJob: jest.fn(),
    getJobs: jest.fn(),
    removeJobs: jest.fn().mockResolvedValue(undefined),
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
};
jest.mock('bull', () => jest.fn(() => mockQueue));
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
// Mock Bull config
jest.mock('../../config/bull.config', () => ({
    createQueue: jest.fn(() => mockQueue),
    BULL_CONFIG: {
        redis: 'redis://localhost:6379',
        concurrency: 5,
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: 100,
            removeOnFail: 100,
        },
    },
}));
describe('InboxMessageQueue', () => {
    let inboxMessageQueue;
    let mockConversationRepo;
    let mockMessageRepo;
    let mockCustomerRepo;
    let mockChannelAccountRepo;
    let mockMessagingService;
    let mockMetaMediaService;
    let mockRateLimiterService;
    let mockSseService;
    let mockMessagingWindowService;
    const tenantId = 'tenant-123';
    const conversationId = 'conv-123';
    const messageId = 'msg-123';
    const channelAccountId = 'channel-account-123';
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const createMockMessage = (overrides = {}) => ({
        id: messageId,
        tenantId,
        conversationId,
        direction: enums_1.MessageDirection.OUTBOUND,
        contentType: enums_1.MessageContentType.TEXT,
        content: { body: 'Hello, customer!' },
        providerMessageId: null,
        deliveryStatus: enums_1.MessageDeliveryStatus.PENDING,
        sentById: 'user-123',
        sentBy: null,
        errorMessage: null,
        errorCode: null,
        retryCount: 0,
        metadata: null,
        sentAt: null,
        deliveredAt: null,
        readAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        conversation: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tenant: null,
        ...overrides,
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const createMockConversation = (overrides = {}) => ({
        id: conversationId,
        tenantId,
        customerId: 'customer-123',
        channelAccountId,
        assignedToId: null,
        status: enums_1.ConversationStatus.ACTIVE,
        lastMessageAt: new Date(),
        lastMessagePreview: 'Previous message',
        lastMessageDirection: enums_1.MessageDirection.INBOUND,
        unreadCount: 0,
        lastCustomerMessageAt: new Date(), // Within 24-hour window by default
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        customer: null,
        channelAccount: null,
        assignedTo: null,
        messages: [],
        notes: [],
        assignments: [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tenant: null,
        ...overrides,
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const createMockChannelAccount = (overrides = {}) => ({
        id: channelAccountId,
        tenantId,
        channelId: 'whatsapp-channel-1',
        providerId: 'meta-provider-1',
        name: 'Support Line',
        phoneNumber: '+1234567890',
        encryptedCredentials: 'encrypted',
        credentialsIv: 'iv',
        isActive: true,
        isPrimary: true,
        status: channel_account_entity_1.ChannelAccountStatus.CONNECTED,
        lastTestedAt: new Date(),
        errorMessage: null,
        webhookUrl: null,
        webhookSecretEncrypted: null,
        webhookSecretIv: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tenant: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        channel: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        provider: null,
        ...overrides,
    });
    beforeEach(() => {
        jest.clearAllMocks();
        mockConversationRepo = {
            findById: jest.fn(),
            findByCustomerAndChannel: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            updateLastMessage: jest.fn(),
            incrementUnreadCount: jest.fn(),
            updateLastCustomerMessageAt: jest.fn(),
        };
        mockMessageRepo = {
            findById: jest.fn(),
            findByProviderMessageId: jest.fn(),
            create: jest.fn(),
            updateDeliveryStatus: jest.fn(),
            updateError: jest.fn(),
            incrementRetryCount: jest.fn(),
        };
        mockCustomerRepo = {
            findById: jest.fn(),
            findByWhatsApp: jest.fn(),
            create: jest.fn(),
        };
        mockChannelAccountRepo = {
            findById: jest.fn(),
            findByIdAndTenant: jest.fn(),
        };
        mockMessagingService = {
            getProviderForChannelAccount: jest.fn(),
        };
        mockMetaMediaService = {
            processInboundMedia: jest.fn(),
            refreshMediaUrl: jest.fn(),
        };
        mockSseService = {
            emitToTenant: jest.fn(),
            emitConversationEvent: jest.fn(),
        };
        mockMessagingWindowService = {
            isWindowOpen: jest.fn().mockReturnValue(true), // Window open by default
            getWindowExpiry: jest.fn(),
            getTimeRemaining: jest.fn(),
        };
        mockRateLimiterService = {
            isInBackoff: jest.fn().mockResolvedValue(false),
            acquireToken: jest.fn().mockResolvedValue(true),
            handleRateLimitError: jest.fn().mockResolvedValue(undefined),
            checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 79, resetAt: new Date() }),
            isRateLimitError: jest.fn().mockReturnValue(false),
            extractRetryAfter: jest.fn().mockReturnValue(undefined),
        };
        const mockOutgoingWebhookService = {
            dispatchUnassignedMessageWebhook: jest.fn().mockResolvedValue(undefined),
        };
        inboxMessageQueue = new inbox_message_queue_1.InboxMessageQueue(mockConversationRepo, mockMessageRepo, mockCustomerRepo, mockChannelAccountRepo, mockMessagingService, mockMetaMediaService, mockRateLimiterService, mockSseService, mockMessagingWindowService, mockOutgoingWebhookService);
    });
    describe('queueOutboundMessage', () => {
        it('should add a job to the queue with correct job type and data', async () => {
            const jobData = {
                messageId,
                conversationId,
                tenantId,
                channelAccountId,
                recipient: '+1234567890',
                contentType: 'text',
                content: { text: 'Hello!' },
            };
            const jobId = await inboxMessageQueue.queueOutboundMessage(jobData);
            expect(mockQueue.add).toHaveBeenCalledWith(inbox_message_queue_1.InboxJobType.SEND_MESSAGE, expect.objectContaining({
                ...jobData,
                attempt: 1,
            }), expect.objectContaining({
                jobId: `inbox-msg:${messageId}`,
            }));
            expect(jobId).toBe('job-1');
        });
        it('should initialize attempt to 1', async () => {
            const jobData = {
                messageId,
                conversationId,
                tenantId,
                channelAccountId,
                recipient: '+1234567890',
                contentType: 'text',
                content: { text: 'Hello!' },
            };
            await inboxMessageQueue.queueOutboundMessage(jobData);
            const addCall = mockQueue.add.mock.calls[0];
            expect(addCall[1].attempt).toBe(1);
        });
    });
    describe('queueInboundProcessing', () => {
        it('should add an inbound processing job to the queue', async () => {
            const jobData = {
                tenantId,
                channelAccountId,
                providerMessageId: 'provider-msg-123',
                fromNumber: '+1234567890',
                messageType: 'text',
                content: { body: 'Hello from customer' },
                timestamp: new Date(),
                rawEvent: { type: 'message' },
            };
            const jobId = await inboxMessageQueue.queueInboundProcessing(jobData);
            expect(mockQueue.add).toHaveBeenCalledWith(inbox_message_queue_1.InboxJobType.PROCESS_INBOUND, jobData, expect.objectContaining({
                jobId: expect.stringContaining('inbox-inbound:'),
            }));
            expect(jobId).toBe('job-1');
        });
    });
    describe('getQueueStats', () => {
        it('should return queue statistics', async () => {
            mockQueue.getJobCounts.mockResolvedValue({
                waiting: 10,
                active: 2,
                completed: 100,
                failed: 5,
                delayed: 3,
                paused: 0,
            });
            const stats = await inboxMessageQueue.getQueueStats();
            expect(stats).toEqual({
                waiting: 10,
                active: 2,
                completed: 100,
                failed: 5,
                delayed: 3,
                paused: 0,
            });
        });
    });
    describe('closeQueue', () => {
        it('should close the queue gracefully', async () => {
            await inboxMessageQueue.closeQueue();
            expect(mockQueue.close).toHaveBeenCalled();
        });
    });
});
describe('InboxMessageQueue Job Processors', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let inboxMessageQueue;
    let mockConversationRepo;
    let mockMessageRepo;
    let mockCustomerRepo;
    let mockChannelAccountRepo;
    let mockMessagingService;
    let mockMetaMediaService;
    let mockRateLimiterService;
    let mockSseService;
    let mockMessagingWindowService;
    let sendMessageProcessor;
    let processInboundProcessor;
    const tenantId = 'tenant-123';
    const conversationId = 'conv-123';
    const messageId = 'msg-123';
    const channelAccountId = 'channel-account-123';
    const createMockMessage = (overrides = {}) => ({
        id: messageId,
        tenantId,
        conversationId,
        direction: enums_1.MessageDirection.OUTBOUND,
        contentType: enums_1.MessageContentType.TEXT,
        content: { body: 'Hello, customer!' },
        providerMessageId: null,
        deliveryStatus: enums_1.MessageDeliveryStatus.PENDING,
        sentById: 'user-123',
        sentBy: null,
        errorMessage: null,
        errorCode: null,
        retryCount: 0,
        metadata: null,
        sentAt: null,
        deliveredAt: null,
        readAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        conversation: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tenant: null,
        ...overrides,
    });
    const createMockConversation = (overrides = {}) => ({
        id: conversationId,
        tenantId,
        customerId: 'customer-123',
        channelAccountId,
        assignedToId: null,
        status: enums_1.ConversationStatus.ACTIVE,
        lastMessageAt: new Date(),
        lastMessagePreview: 'Previous message',
        lastMessageDirection: enums_1.MessageDirection.INBOUND,
        unreadCount: 0,
        lastCustomerMessageAt: new Date(), // Within 24-hour window by default
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        customer: null,
        channelAccount: null,
        assignedTo: null,
        messages: [],
        notes: [],
        assignments: [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tenant: null,
        ...overrides,
    });
    const createMockChannelAccount = (overrides = {}) => ({
        id: channelAccountId,
        tenantId,
        channelId: 'whatsapp-channel-1',
        providerId: 'meta-provider-1',
        name: 'Support Line',
        phoneNumber: '+1234567890',
        encryptedCredentials: 'encrypted',
        credentialsIv: 'iv',
        isActive: true,
        isPrimary: true,
        status: channel_account_entity_1.ChannelAccountStatus.CONNECTED,
        lastTestedAt: new Date(),
        errorMessage: null,
        webhookUrl: null,
        webhookSecretEncrypted: null,
        webhookSecretIv: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tenant: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        channel: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        provider: null,
        ...overrides,
    });
    beforeEach(() => {
        jest.clearAllMocks();
        // Capture the processor functions when process is called
        mockQueue.process.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (jobType, _concurrency, processor) => {
            if (jobType === inbox_message_queue_1.InboxJobType.SEND_MESSAGE) {
                sendMessageProcessor = processor;
            }
            else if (jobType === inbox_message_queue_1.InboxJobType.PROCESS_INBOUND) {
                processInboundProcessor = processor;
            }
        });
        mockConversationRepo = {
            findById: jest.fn(),
            findByCustomerAndChannel: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            updateLastMessage: jest.fn(),
            incrementUnreadCount: jest.fn(),
            updateLastCustomerMessageAt: jest.fn(),
        };
        mockMessageRepo = {
            findById: jest.fn(),
            findByProviderMessageId: jest.fn(),
            create: jest.fn(),
            updateDeliveryStatus: jest.fn(),
            updateError: jest.fn(),
            incrementRetryCount: jest.fn(),
        };
        mockCustomerRepo = {
            findById: jest.fn(),
            findByWhatsApp: jest.fn(),
            create: jest.fn(),
        };
        mockChannelAccountRepo = {
            findById: jest.fn(),
            findByIdAndTenant: jest.fn(),
        };
        mockMessagingService = {
            getProviderForChannelAccount: jest.fn(),
        };
        mockMetaMediaService = {
            processInboundMedia: jest.fn(),
            refreshMediaUrl: jest.fn(),
        };
        mockSseService = {
            emitToTenant: jest.fn(),
            emitConversationEvent: jest.fn(),
        };
        mockMessagingWindowService = {
            isWindowOpen: jest.fn().mockReturnValue(true), // Window open by default
            getWindowExpiry: jest.fn(),
            getTimeRemaining: jest.fn(),
        };
        mockRateLimiterService = {
            isInBackoff: jest.fn().mockResolvedValue(false),
            acquireToken: jest.fn().mockResolvedValue(true),
            handleRateLimitError: jest.fn().mockResolvedValue(undefined),
            checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 79, resetAt: new Date() }),
            isRateLimitError: jest.fn().mockReturnValue(false),
            extractRetryAfter: jest.fn().mockReturnValue(undefined),
        };
        const mockOutgoingWebhookService = {
            dispatchUnassignedMessageWebhook: jest.fn().mockResolvedValue(undefined),
        };
        inboxMessageQueue = new inbox_message_queue_1.InboxMessageQueue(mockConversationRepo, mockMessageRepo, mockCustomerRepo, mockChannelAccountRepo, mockMessagingService, mockMetaMediaService, mockRateLimiterService, mockSseService, mockMessagingWindowService, mockOutgoingWebhookService);
    });
    describe('SEND_MESSAGE processor', () => {
        it('should send message successfully and update status to SENT', async () => {
            const message = createMockMessage();
            const channelAccount = createMockChannelAccount();
            const conversation = createMockConversation();
            const mockProvider = {
                sendFreeformMessage: jest.fn().mockResolvedValue({
                    success: true,
                    providerMessageId: 'provider-msg-123',
                    timestamp: new Date(),
                }),
            };
            mockMessageRepo.findById.mockResolvedValue(message);
            mockChannelAccountRepo.findByIdAndTenant.mockResolvedValue(channelAccount);
            mockConversationRepo.findById.mockResolvedValue(conversation);
            mockMessagingService.getProviderForChannelAccount.mockResolvedValue(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockProvider);
            const mockJob = {
                data: {
                    messageId,
                    conversationId,
                    tenantId,
                    channelAccountId,
                    recipient: '+1234567890',
                    contentType: 'text',
                    content: { text: 'Hello!' },
                    attempt: 1,
                },
                id: 'job-1',
                attemptsMade: 0,
            };
            await sendMessageProcessor(mockJob);
            expect(mockProvider.sendFreeformMessage).toHaveBeenCalledWith({
                recipient: '+1234567890',
                contentType: 'text',
                content: { text: 'Hello!' },
                messageId,
            });
            expect(mockMessageRepo.updateDeliveryStatus).toHaveBeenCalledWith(messageId, enums_1.MessageDeliveryStatus.SENT, expect.objectContaining({ sentAt: expect.any(Date) }));
            expect(mockSseService.emitConversationEvent).toHaveBeenCalledWith(tenantId, conversationId, 'conversation:message:status', expect.objectContaining({
                messageId,
                status: enums_1.MessageDeliveryStatus.SENT,
            }));
        });
        it('should throw error to trigger retry when provider returns retryable error', async () => {
            const message = createMockMessage();
            const channelAccount = createMockChannelAccount();
            const conversation = createMockConversation();
            const mockProvider = {
                sendFreeformMessage: jest.fn().mockResolvedValue({
                    success: false,
                    error: {
                        code: 'RATE_LIMITED',
                        message: 'Too many requests',
                        retryable: true,
                    },
                }),
            };
            mockMessageRepo.findById.mockResolvedValue(message);
            mockChannelAccountRepo.findByIdAndTenant.mockResolvedValue(channelAccount);
            mockConversationRepo.findById.mockResolvedValue(conversation);
            mockMessagingService.getProviderForChannelAccount.mockResolvedValue(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockProvider);
            const mockJob = {
                data: {
                    messageId,
                    conversationId,
                    tenantId,
                    channelAccountId,
                    recipient: '+1234567890',
                    contentType: 'text',
                    content: { text: 'Hello!' },
                    attempt: 1,
                },
                id: 'job-1',
                attemptsMade: 0,
            };
            await expect(sendMessageProcessor(mockJob)).rejects.toThrow('RATE_LIMITED');
            expect(mockMessageRepo.incrementRetryCount).toHaveBeenCalledWith(messageId);
        });
        it('should mark message as FAILED when non-retryable error occurs', async () => {
            const message = createMockMessage();
            const channelAccount = createMockChannelAccount();
            const conversation = createMockConversation();
            const mockProvider = {
                sendFreeformMessage: jest.fn().mockResolvedValue({
                    success: false,
                    error: {
                        code: 'INVALID_RECIPIENT',
                        message: 'Phone number not on WhatsApp',
                        retryable: false,
                    },
                }),
            };
            mockMessageRepo.findById.mockResolvedValue(message);
            mockChannelAccountRepo.findByIdAndTenant.mockResolvedValue(channelAccount);
            mockConversationRepo.findById.mockResolvedValue(conversation);
            mockMessagingService.getProviderForChannelAccount.mockResolvedValue(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockProvider);
            const mockJob = {
                data: {
                    messageId,
                    conversationId,
                    tenantId,
                    channelAccountId,
                    recipient: '+1234567890',
                    contentType: 'text',
                    content: { text: 'Hello!' },
                    attempt: 1,
                },
                id: 'job-1',
                attemptsMade: 0,
            };
            await sendMessageProcessor(mockJob);
            expect(mockMessageRepo.updateError).toHaveBeenCalledWith(messageId, 'INVALID_RECIPIENT', 'Phone number not on WhatsApp');
            expect(mockSseService.emitConversationEvent).toHaveBeenCalledWith(tenantId, conversationId, 'conversation:message:status', expect.objectContaining({
                messageId,
                status: enums_1.MessageDeliveryStatus.FAILED,
            }));
        });
        it('should mark message as FAILED when max retries exhausted', async () => {
            const message = createMockMessage({ retryCount: 3 });
            const channelAccount = createMockChannelAccount();
            const conversation = createMockConversation();
            const mockProvider = {
                sendFreeformMessage: jest.fn().mockResolvedValue({
                    success: false,
                    error: {
                        code: 'RATE_LIMITED',
                        message: 'Too many requests',
                        retryable: true,
                    },
                }),
            };
            mockMessageRepo.findById.mockResolvedValue(message);
            mockChannelAccountRepo.findByIdAndTenant.mockResolvedValue(channelAccount);
            mockConversationRepo.findById.mockResolvedValue(conversation);
            mockMessagingService.getProviderForChannelAccount.mockResolvedValue(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockProvider);
            const mockJob = {
                data: {
                    messageId,
                    conversationId,
                    tenantId,
                    channelAccountId,
                    recipient: '+1234567890',
                    contentType: 'text',
                    content: { text: 'Hello!' },
                    attempt: 4, // 4th attempt (initial + 3 retries)
                },
                id: 'job-1',
                attemptsMade: 3,
            };
            await sendMessageProcessor(mockJob);
            expect(mockMessageRepo.updateError).toHaveBeenCalledWith(messageId, 'MAX_RETRIES_EXCEEDED', expect.stringContaining('retries'));
        });
        it('should throw error when message not found', async () => {
            mockMessageRepo.findById.mockResolvedValue(null);
            const mockJob = {
                data: {
                    messageId,
                    conversationId,
                    tenantId,
                    channelAccountId,
                    recipient: '+1234567890',
                    contentType: 'text',
                    content: { text: 'Hello!' },
                    attempt: 1,
                },
                id: 'job-1',
                attemptsMade: 0,
            };
            await expect(sendMessageProcessor(mockJob)).rejects.toThrow(`Message not found: ${messageId}`);
        });
        it('should throw error when channel account not found', async () => {
            const message = createMockMessage();
            mockMessageRepo.findById.mockResolvedValue(message);
            mockChannelAccountRepo.findByIdAndTenant.mockResolvedValue(null);
            const mockJob = {
                data: {
                    messageId,
                    conversationId,
                    tenantId,
                    channelAccountId,
                    recipient: '+1234567890',
                    contentType: 'text',
                    content: { text: 'Hello!' },
                    attempt: 1,
                },
                id: 'job-1',
                attemptsMade: 0,
            };
            await expect(sendMessageProcessor(mockJob)).rejects.toThrow(`Channel account not found: ${channelAccountId}`);
        });
        it('should fail freeform message when 24-hour messaging window is closed', async () => {
            const message = createMockMessage();
            const channelAccount = createMockChannelAccount();
            const conversation = createMockConversation({
                // Last customer message was 25 hours ago - window is closed
                lastCustomerMessageAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
            });
            const mockProvider = {
                sendFreeformMessage: jest.fn(),
            };
            mockMessageRepo.findById.mockResolvedValue(message);
            mockChannelAccountRepo.findByIdAndTenant.mockResolvedValue(channelAccount);
            mockConversationRepo.findById.mockResolvedValue(conversation);
            mockMessagingService.getProviderForChannelAccount.mockResolvedValue(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockProvider);
            mockMessagingWindowService.isWindowOpen.mockReturnValue(false);
            const mockJob = {
                data: {
                    messageId,
                    conversationId,
                    tenantId,
                    channelAccountId,
                    recipient: '+1234567890',
                    contentType: 'text',
                    content: { text: 'Hello!' },
                    attempt: 1,
                },
                id: 'job-1',
                attemptsMade: 0,
            };
            await sendMessageProcessor(mockJob);
            expect(mockMessagingWindowService.isWindowOpen).toHaveBeenCalledWith(conversation.lastCustomerMessageAt);
            expect(mockProvider.sendFreeformMessage).not.toHaveBeenCalled();
            expect(mockMessageRepo.updateError).toHaveBeenCalledWith(messageId, 'MESSAGING_WINDOW_CLOSED', 'Cannot send freeform message outside 24-hour messaging window. Use a template message instead.');
            expect(mockSseService.emitConversationEvent).toHaveBeenCalledWith(tenantId, conversationId, 'conversation:message:status', expect.objectContaining({
                messageId,
                status: enums_1.MessageDeliveryStatus.FAILED,
                errorCode: 'MESSAGING_WINDOW_CLOSED',
            }));
        });
        it('should allow template messages regardless of messaging window status', async () => {
            const message = createMockMessage();
            const channelAccount = createMockChannelAccount();
            const mockProvider = {
                sendTemplateMessage: jest.fn().mockResolvedValue({
                    success: true,
                    providerMessageId: 'provider-msg-123',
                    timestamp: new Date(),
                }),
            };
            mockMessageRepo.findById.mockResolvedValue(message);
            mockChannelAccountRepo.findByIdAndTenant.mockResolvedValue(channelAccount);
            mockMessagingService.getProviderForChannelAccount.mockResolvedValue(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockProvider);
            // Window is closed, but template should still work
            mockMessagingWindowService.isWindowOpen.mockReturnValue(false);
            const mockJob = {
                data: {
                    messageId,
                    conversationId,
                    tenantId,
                    channelAccountId,
                    recipient: '+1234567890',
                    contentType: 'template',
                    content: {
                        templateName: 'welcome',
                        templateLanguage: 'en_US',
                    },
                    attempt: 1,
                },
                id: 'job-1',
                attemptsMade: 0,
            };
            await sendMessageProcessor(mockJob);
            // Template messages bypass the window check
            expect(mockMessagingWindowService.isWindowOpen).not.toHaveBeenCalled();
            expect(mockProvider.sendTemplateMessage).toHaveBeenCalled();
            expect(mockMessageRepo.updateDeliveryStatus).toHaveBeenCalledWith(messageId, enums_1.MessageDeliveryStatus.SENT, expect.objectContaining({ sentAt: expect.any(Date) }));
        });
        it('should send freeform message when 24-hour window is open', async () => {
            const message = createMockMessage();
            const channelAccount = createMockChannelAccount();
            const conversation = createMockConversation({
                // Last customer message was 1 hour ago - window is open
                lastCustomerMessageAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
            });
            const mockProvider = {
                sendFreeformMessage: jest.fn().mockResolvedValue({
                    success: true,
                    providerMessageId: 'provider-msg-123',
                    timestamp: new Date(),
                }),
            };
            mockMessageRepo.findById.mockResolvedValue(message);
            mockChannelAccountRepo.findByIdAndTenant.mockResolvedValue(channelAccount);
            mockConversationRepo.findById.mockResolvedValue(conversation);
            mockMessagingService.getProviderForChannelAccount.mockResolvedValue(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockProvider);
            mockMessagingWindowService.isWindowOpen.mockReturnValue(true);
            const mockJob = {
                data: {
                    messageId,
                    conversationId,
                    tenantId,
                    channelAccountId,
                    recipient: '+1234567890',
                    contentType: 'text',
                    content: { text: 'Hello!' },
                    attempt: 1,
                },
                id: 'job-1',
                attemptsMade: 0,
            };
            await sendMessageProcessor(mockJob);
            expect(mockMessagingWindowService.isWindowOpen).toHaveBeenCalledWith(conversation.lastCustomerMessageAt);
            expect(mockProvider.sendFreeformMessage).toHaveBeenCalled();
            expect(mockMessageRepo.updateDeliveryStatus).toHaveBeenCalledWith(messageId, enums_1.MessageDeliveryStatus.SENT, expect.objectContaining({ sentAt: expect.any(Date) }));
        });
    });
    describe('PROCESS_INBOUND processor', () => {
        it('should create message for existing conversation and customer', async () => {
            const conversation = createMockConversation();
            const customer = {
                id: 'customer-123',
                name: 'John Doe',
                whatsappNumber: '+1234567890',
                tenantId,
            };
            const channelAccount = createMockChannelAccount();
            mockChannelAccountRepo.findById.mockResolvedValue(channelAccount);
            mockCustomerRepo.findByWhatsApp.mockResolvedValue(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            customer);
            mockConversationRepo.findByCustomerAndChannel.mockResolvedValue(conversation);
            mockMessageRepo.create.mockResolvedValue(createMockMessage());
            const mockJob = {
                data: {
                    tenantId,
                    channelAccountId,
                    providerMessageId: 'provider-msg-123',
                    fromNumber: '+1234567890',
                    messageType: 'text',
                    content: { body: 'Hello from customer' },
                    timestamp: new Date(),
                    rawEvent: { type: 'message' },
                },
                id: 'job-1',
            };
            await processInboundProcessor(mockJob);
            expect(mockMessageRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                tenantId,
                conversationId,
                direction: enums_1.MessageDirection.INBOUND,
                providerMessageId: 'provider-msg-123',
            }));
            expect(mockConversationRepo.updateLastMessage).toHaveBeenCalled();
            // Verify lastCustomerMessageAt is updated for 24-hour messaging window tracking
            expect(mockConversationRepo.updateLastCustomerMessageAt).toHaveBeenCalledWith(tenantId, conversationId, expect.any(Date));
            expect(mockConversationRepo.incrementUnreadCount).toHaveBeenCalled();
            expect(mockSseService.emitConversationEvent).toHaveBeenCalledWith(tenantId, conversationId, 'conversation:message:new', expect.any(Object));
        });
        it('should create new customer when not found', async () => {
            const channelAccount = createMockChannelAccount();
            const newCustomer = {
                id: 'new-customer-123',
                name: '+1234567890',
                whatsappNumber: '+1234567890',
                tenantId,
            };
            const newConversation = createMockConversation({
                customerId: newCustomer.id,
            });
            mockChannelAccountRepo.findById.mockResolvedValue(channelAccount);
            mockCustomerRepo.findByWhatsApp.mockResolvedValue(null);
            mockCustomerRepo.create.mockResolvedValue(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            newCustomer);
            mockConversationRepo.findByCustomerAndChannel.mockResolvedValue(null);
            mockConversationRepo.create.mockResolvedValue(newConversation);
            mockMessageRepo.create.mockResolvedValue(createMockMessage());
            const mockJob = {
                data: {
                    tenantId,
                    channelAccountId,
                    providerMessageId: 'provider-msg-123',
                    fromNumber: '+1234567890',
                    messageType: 'text',
                    content: { body: 'Hello from new customer' },
                    timestamp: new Date(),
                    rawEvent: { type: 'message' },
                },
                id: 'job-1',
            };
            await processInboundProcessor(mockJob);
            expect(mockCustomerRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                tenantId,
                whatsappNumber: '+1234567890',
                name: '+1234567890',
            }));
        });
        it('should create new conversation when not found', async () => {
            const channelAccount = createMockChannelAccount();
            const customer = {
                id: 'customer-123',
                name: 'John Doe',
                whatsappNumber: '+1234567890',
                tenantId,
            };
            const newConversation = createMockConversation();
            mockChannelAccountRepo.findById.mockResolvedValue(channelAccount);
            mockCustomerRepo.findByWhatsApp.mockResolvedValue(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            customer);
            mockConversationRepo.findByCustomerAndChannel.mockResolvedValue(null);
            mockConversationRepo.create.mockResolvedValue(newConversation);
            mockMessageRepo.create.mockResolvedValue(createMockMessage());
            const mockJob = {
                data: {
                    tenantId,
                    channelAccountId,
                    providerMessageId: 'provider-msg-123',
                    fromNumber: '+1234567890',
                    messageType: 'text',
                    content: { body: 'Hello' },
                    timestamp: new Date(),
                    rawEvent: { type: 'message' },
                },
                id: 'job-1',
            };
            await processInboundProcessor(mockJob);
            expect(mockConversationRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                tenantId,
                customerId: customer.id,
                channelAccountId,
                status: enums_1.ConversationStatus.UNASSIGNED,
            }));
            expect(mockSseService.emitToTenant).toHaveBeenCalledWith(tenantId, 'conversation:new', expect.any(Object));
        });
        it('should skip processing if channel account not found', async () => {
            mockChannelAccountRepo.findById.mockResolvedValue(null);
            const mockJob = {
                data: {
                    tenantId,
                    channelAccountId,
                    providerMessageId: 'provider-msg-123',
                    fromNumber: '+1234567890',
                    messageType: 'text',
                    content: { body: 'Hello' },
                    timestamp: new Date(),
                    rawEvent: { type: 'message' },
                },
                id: 'job-1',
            };
            await expect(processInboundProcessor(mockJob)).rejects.toThrow(`Channel account not found: ${channelAccountId}`);
        });
    });
});
