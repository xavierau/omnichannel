"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const outgoing_webhook_service_1 = require("../services/outgoing-webhook.service");
const channel_account_entity_1 = require("../../channel-accounts/channel-account.entity");
const enums_1 = require("../../inbox/enums");
// Mock logger
jest.mock('../../../config/logger.config', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));
describe('OutgoingWebhookService', () => {
    let service;
    let mockChannelAccountRepo;
    let mockWebhookQueue;
    const createMockChannelAccount = (overrides = {}) => ({
        id: 'ca-001',
        tenantId: 'tenant-123',
        channelId: 'whatsapp-channel-1',
        providerId: 'meta-provider-1',
        name: 'Support Line',
        phoneNumber: '+1234567890',
        phoneNumberId: '123456789',
        encryptedCredentials: 'encrypted',
        credentialsIv: 'iv',
        isActive: true,
        isPrimary: true,
        status: channel_account_entity_1.ChannelAccountStatus.CONNECTED,
        lastTestedAt: new Date(),
        errorMessage: null,
        webhookUrl: 'https://example.com/webhook',
        webhookSecretEncrypted: 'encrypted-secret',
        webhookSecretIv: 'iv-value',
        createdAt: new Date(),
        updatedAt: new Date(),
        tenant: null,
        channel: null,
        provider: null,
        ...overrides,
    });
    const createMockConversation = (overrides = {}) => ({
        id: 'conv-456',
        tenantId: 'tenant-123',
        customerId: 'cust-789',
        channelAccountId: 'ca-001',
        assignedToId: null,
        status: enums_1.ConversationStatus.UNASSIGNED,
        lastMessageAt: new Date('2024-01-15T10:30:00.000Z'),
        lastMessagePreview: 'Hello',
        lastMessageDirection: enums_1.MessageDirection.INBOUND,
        unreadCount: 1,
        lastCustomerMessageAt: new Date('2024-01-15T10:30:00.000Z'),
        metadata: null,
        createdAt: new Date('2024-01-15T10:00:00.000Z'),
        updatedAt: new Date('2024-01-15T10:30:00.000Z'),
        tenant: null,
        customer: null,
        channelAccount: null,
        assignedTo: null,
        messages: [],
        notes: [],
        assignments: [],
        ...overrides,
    });
    const createMockMessage = (overrides = {}) => ({
        id: 'msg-123',
        tenantId: 'tenant-123',
        conversationId: 'conv-456',
        direction: enums_1.MessageDirection.INBOUND,
        contentType: enums_1.MessageContentType.TEXT,
        content: { body: 'Hello, I need help!' },
        providerMessageId: 'wamid.abc123',
        deliveryStatus: enums_1.MessageDeliveryStatus.DELIVERED,
        sentById: null,
        errorMessage: null,
        errorCode: null,
        retryCount: 0,
        metadata: null,
        sentAt: new Date('2024-01-15T10:30:00.000Z'),
        deliveredAt: new Date('2024-01-15T10:30:00.000Z'),
        readAt: null,
        createdAt: new Date('2024-01-15T10:30:00.000Z'),
        updatedAt: new Date('2024-01-15T10:30:00.000Z'),
        tenant: null,
        conversation: null,
        sentBy: null,
        ...overrides,
    });
    const createMockCustomer = (overrides = {}) => ({
        id: 'cust-789',
        tenantId: 'tenant-123',
        name: 'John Doe',
        whatsappNumber: '+85291234567',
        customFields: { priority: 'high' },
        tags: [],
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-15T10:30:00.000Z'),
        tenant: null,
        ...overrides,
    });
    beforeEach(() => {
        jest.clearAllMocks();
        mockChannelAccountRepo = {
            findById: jest.fn(),
        };
        mockWebhookQueue = {
            queueDispatch: jest.fn().mockResolvedValue('job-123'),
        };
        service = new outgoing_webhook_service_1.OutgoingWebhookService(mockChannelAccountRepo, mockWebhookQueue);
    });
    describe('maybeDispatchWebhook', () => {
        it('should queue webhook when channel account has webhook configured', async () => {
            const channelAccount = createMockChannelAccount();
            const conversation = createMockConversation();
            const message = createMockMessage();
            const customer = createMockCustomer();
            const jobId = await service.maybeDispatchWebhook({
                message,
                conversation,
                customer,
                channelAccount,
            });
            expect(jobId).toBe('job-123');
            expect(mockWebhookQueue.queueDispatch).toHaveBeenCalledWith(expect.objectContaining({
                webhookUrl: 'https://example.com/webhook',
                secretEncrypted: 'encrypted-secret',
                secretIv: 'iv-value',
                channelAccountId: 'ca-001',
                tenantId: 'tenant-123',
                payload: expect.objectContaining({
                    event: 'message.received.unassigned',
                    message: expect.objectContaining({
                        id: 'msg-123',
                        providerMessageId: 'wamid.abc123',
                        contentType: 'text',
                        content: { body: 'Hello, I need help!' },
                    }),
                    conversation: expect.objectContaining({
                        id: 'conv-456',
                        status: 'unassigned',
                    }),
                    customer: expect.objectContaining({
                        id: 'cust-789',
                        name: 'John Doe',
                        whatsappNumber: '+85291234567',
                        customFields: { priority: 'high' },
                    }),
                    channelAccount: expect.objectContaining({
                        id: 'ca-001',
                        name: 'Support Line',
                        phoneNumber: '+1234567890',
                    }),
                    tenantId: 'tenant-123',
                }),
            }));
        });
        it('should skip dispatch when webhookUrl is not configured', async () => {
            const channelAccount = createMockChannelAccount({ webhookUrl: null });
            const conversation = createMockConversation();
            const message = createMockMessage();
            const customer = createMockCustomer();
            const jobId = await service.maybeDispatchWebhook({
                message,
                conversation,
                customer,
                channelAccount,
            });
            expect(jobId).toBeUndefined();
            expect(mockWebhookQueue.queueDispatch).not.toHaveBeenCalled();
        });
        it('should skip dispatch when webhookUrl is empty string', async () => {
            const channelAccount = createMockChannelAccount({ webhookUrl: '' });
            const conversation = createMockConversation();
            const message = createMockMessage();
            const customer = createMockCustomer();
            const jobId = await service.maybeDispatchWebhook({
                message,
                conversation,
                customer,
                channelAccount,
            });
            expect(jobId).toBeUndefined();
            expect(mockWebhookQueue.queueDispatch).not.toHaveBeenCalled();
        });
        it('should skip dispatch when secret is not configured', async () => {
            const channelAccount = createMockChannelAccount({
                webhookUrl: 'https://example.com/webhook',
                webhookSecretEncrypted: null,
                webhookSecretIv: null,
            });
            const conversation = createMockConversation();
            const message = createMockMessage();
            const customer = createMockCustomer();
            const jobId = await service.maybeDispatchWebhook({
                message,
                conversation,
                customer,
                channelAccount,
            });
            expect(jobId).toBeUndefined();
            expect(mockWebhookQueue.queueDispatch).not.toHaveBeenCalled();
        });
        it('should skip dispatch when secret IV is missing', async () => {
            const channelAccount = createMockChannelAccount({
                webhookUrl: 'https://example.com/webhook',
                webhookSecretEncrypted: 'encrypted-secret',
                webhookSecretIv: null,
            });
            const conversation = createMockConversation();
            const message = createMockMessage();
            const customer = createMockCustomer();
            const jobId = await service.maybeDispatchWebhook({
                message,
                conversation,
                customer,
                channelAccount,
            });
            expect(jobId).toBeUndefined();
            expect(mockWebhookQueue.queueDispatch).not.toHaveBeenCalled();
        });
        it('should include timestamp in ISO 8601 format', async () => {
            const channelAccount = createMockChannelAccount();
            const conversation = createMockConversation();
            const message = createMockMessage();
            const customer = createMockCustomer();
            await service.maybeDispatchWebhook({
                message,
                conversation,
                customer,
                channelAccount,
            });
            const callArgs = mockWebhookQueue.queueDispatch.mock.calls[0][0];
            expect(callArgs.payload.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
        });
        it('should handle null lastMessageAt in conversation', async () => {
            const channelAccount = createMockChannelAccount();
            const conversation = createMockConversation({ lastMessageAt: null });
            const message = createMockMessage();
            const customer = createMockCustomer();
            const jobId = await service.maybeDispatchWebhook({
                message,
                conversation,
                customer,
                channelAccount,
            });
            expect(jobId).toBe('job-123');
            const callArgs = mockWebhookQueue.queueDispatch.mock.calls[0][0];
            expect(callArgs.payload.conversation.lastMessageAt).toBeNull();
        });
        it('should use createdAt when sentAt is null', async () => {
            const channelAccount = createMockChannelAccount();
            const conversation = createMockConversation();
            const message = createMockMessage({ sentAt: null });
            const customer = createMockCustomer();
            await service.maybeDispatchWebhook({
                message,
                conversation,
                customer,
                channelAccount,
            });
            const callArgs = mockWebhookQueue.queueDispatch.mock.calls[0][0];
            expect(callArgs.payload.message.receivedAt).toBe(message.createdAt.toISOString());
        });
        it('should handle empty customFields', async () => {
            const channelAccount = createMockChannelAccount();
            const conversation = createMockConversation();
            const message = createMockMessage();
            const customer = createMockCustomer({ customFields: {} });
            await service.maybeDispatchWebhook({
                message,
                conversation,
                customer,
                channelAccount,
            });
            const callArgs = mockWebhookQueue.queueDispatch.mock.calls[0][0];
            expect(callArgs.payload.customer.customFields).toEqual({});
        });
        it('should handle null customFields', async () => {
            const channelAccount = createMockChannelAccount();
            const conversation = createMockConversation();
            const message = createMockMessage();
            const customer = createMockCustomer({ customFields: null });
            await service.maybeDispatchWebhook({
                message,
                conversation,
                customer,
                channelAccount,
            });
            const callArgs = mockWebhookQueue.queueDispatch.mock.calls[0][0];
            expect(callArgs.payload.customer.customFields).toEqual({});
        });
    });
    describe('dispatchUnassignedMessageWebhook', () => {
        it('should fetch channel account and dispatch webhook', async () => {
            const channelAccount = createMockChannelAccount();
            const conversation = createMockConversation();
            const message = createMockMessage();
            const customer = createMockCustomer();
            mockChannelAccountRepo.findById.mockResolvedValue(channelAccount);
            const jobId = await service.dispatchUnassignedMessageWebhook(message, conversation, customer, 'ca-001');
            expect(jobId).toBe('job-123');
            expect(mockChannelAccountRepo.findById).toHaveBeenCalledWith('ca-001');
            expect(mockWebhookQueue.queueDispatch).toHaveBeenCalled();
        });
        it('should return undefined when channel account not found', async () => {
            const conversation = createMockConversation();
            const message = createMockMessage();
            const customer = createMockCustomer();
            mockChannelAccountRepo.findById.mockResolvedValue(null);
            const jobId = await service.dispatchUnassignedMessageWebhook(message, conversation, customer, 'non-existent-ca');
            expect(jobId).toBeUndefined();
            expect(mockWebhookQueue.queueDispatch).not.toHaveBeenCalled();
        });
        it('should return undefined when channel account has no webhook configured', async () => {
            const channelAccount = createMockChannelAccount({ webhookUrl: null });
            const conversation = createMockConversation();
            const message = createMockMessage();
            const customer = createMockCustomer();
            mockChannelAccountRepo.findById.mockResolvedValue(channelAccount);
            const jobId = await service.dispatchUnassignedMessageWebhook(message, conversation, customer, 'ca-001');
            expect(jobId).toBeUndefined();
            expect(mockWebhookQueue.queueDispatch).not.toHaveBeenCalled();
        });
    });
});
