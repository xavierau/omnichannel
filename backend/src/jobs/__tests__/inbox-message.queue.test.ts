import 'reflect-metadata';
import Bull from 'bull';
import {
  InboxMessageQueue,
  InboxJobType,
  SendMessageJobData,
  ProcessInboundJobData,
} from '../inbox-message.queue';
import { ConversationRepository } from '../../features/inbox/repositories/conversation.repository';
import { ConversationMessageRepository } from '../../features/inbox/repositories/conversation-message.repository';
import { CustomerRepository } from '../../features/customers/customer.repository';
import { ChannelAccountRepository } from '../../features/channel-accounts/channel-account.repository';
import { MessagingService } from '../../features/messaging/services/messaging.service';
import { MetaMediaService } from '../../features/messaging/services/meta-media.service';
import { MessagingRateLimiterService } from '../../features/messaging/services/rate-limiter.service';
import { InboxSseService } from '../../features/inbox/services/inbox-sse.service';
import { MessagingWindowService } from '../../features/inbox/services/messaging-window.service';
import { ConversationMessage } from '../../features/inbox/entities/conversation-message.entity';
import { Conversation } from '../../features/inbox/entities/conversation.entity';
import {
  MessageDeliveryStatus,
  MessageDirection,
  MessageContentType,
  ConversationStatus,
} from '../../features/inbox/enums';
import { ChannelAccount, ChannelAccountStatus } from '../../features/channel-accounts/channel-account.entity';

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
  let inboxMessageQueue: InboxMessageQueue;
  let mockConversationRepo: jest.Mocked<ConversationRepository>;
  let mockMessageRepo: jest.Mocked<ConversationMessageRepository>;
  let mockCustomerRepo: jest.Mocked<CustomerRepository>;
  let mockChannelAccountRepo: jest.Mocked<ChannelAccountRepository>;
  let mockMessagingService: jest.Mocked<MessagingService>;
  let mockMetaMediaService: jest.Mocked<MetaMediaService>;
  let mockRateLimiterService: jest.Mocked<MessagingRateLimiterService>;
  let mockSseService: jest.Mocked<InboxSseService>;
  let mockMessagingWindowService: jest.Mocked<MessagingWindowService>;

  const tenantId = 'tenant-123';
  const conversationId = 'conv-123';
  const messageId = 'msg-123';
  const channelAccountId = 'channel-account-123';

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const createMockMessage = (overrides: Partial<ConversationMessage> = {}): ConversationMessage =>
    ({
      id: messageId,
      tenantId,
      conversationId,
      direction: MessageDirection.OUTBOUND,
      contentType: MessageContentType.TEXT,
      content: { body: 'Hello, customer!' },
      providerMessageId: null,
      deliveryStatus: MessageDeliveryStatus.PENDING,
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
      conversation: null as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tenant: null as any,
      ...overrides,
    }) as ConversationMessage;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const createMockConversation = (overrides: Partial<Conversation> = {}): Conversation =>
    ({
      id: conversationId,
      tenantId,
      customerId: 'customer-123',
      channelAccountId,
      assignedToId: null,
      status: ConversationStatus.ACTIVE,
      lastMessageAt: new Date(),
      lastMessagePreview: 'Previous message',
      lastMessageDirection: MessageDirection.INBOUND,
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
      tenant: null as any,
      ...overrides,
    }) as Conversation;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const createMockChannelAccount = (
    overrides: Partial<ChannelAccount> = {}
  ): ChannelAccount =>
    ({
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
      status: ChannelAccountStatus.CONNECTED,
      lastTestedAt: new Date(),
      errorMessage: null,
      webhookUrl: null,
      webhookSecretEncrypted: null,
      webhookSecretIv: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tenant: null as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      channel: null as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      provider: null as any,
      ...overrides,
    }) as ChannelAccount;

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
    } as unknown as jest.Mocked<ConversationRepository>;

    mockMessageRepo = {
      findById: jest.fn(),
      findByProviderMessageId: jest.fn(),
      create: jest.fn(),
      updateDeliveryStatus: jest.fn(),
      updateError: jest.fn(),
      incrementRetryCount: jest.fn(),
    } as unknown as jest.Mocked<ConversationMessageRepository>;

    mockCustomerRepo = {
      findById: jest.fn(),
      findByWhatsApp: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<CustomerRepository>;

    mockChannelAccountRepo = {
      findById: jest.fn(),
      findByIdAndTenant: jest.fn(),
    } as unknown as jest.Mocked<ChannelAccountRepository>;

    mockMessagingService = {
      getProviderForChannelAccount: jest.fn(),
    } as unknown as jest.Mocked<MessagingService>;

    mockMetaMediaService = {
      processInboundMedia: jest.fn(),
      refreshMediaUrl: jest.fn(),
    } as unknown as jest.Mocked<MetaMediaService>;

    mockSseService = {
      emitToTenant: jest.fn(),
      emitConversationEvent: jest.fn(),
    } as unknown as jest.Mocked<InboxSseService>;

    mockMessagingWindowService = {
      isWindowOpen: jest.fn().mockReturnValue(true), // Window open by default
      getWindowExpiry: jest.fn(),
      getTimeRemaining: jest.fn(),
    } as unknown as jest.Mocked<MessagingWindowService>;

    mockRateLimiterService = {
      isInBackoff: jest.fn().mockResolvedValue(false),
      acquireToken: jest.fn().mockResolvedValue(true),
      handleRateLimitError: jest.fn().mockResolvedValue(undefined),
      checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 79, resetAt: new Date() }),
      isRateLimitError: jest.fn().mockReturnValue(false),
      extractRetryAfter: jest.fn().mockReturnValue(undefined),
    } as unknown as jest.Mocked<MessagingRateLimiterService>;

    inboxMessageQueue = new InboxMessageQueue(
      mockConversationRepo,
      mockMessageRepo,
      mockCustomerRepo,
      mockChannelAccountRepo,
      mockMessagingService,
      mockMetaMediaService,
      mockRateLimiterService,
      mockSseService,
      mockMessagingWindowService
    );
  });

  describe('queueOutboundMessage', () => {
    it('should add a job to the queue with correct job type and data', async () => {
      const jobData = {
        messageId,
        conversationId,
        tenantId,
        channelAccountId,
        recipient: '+1234567890',
        contentType: 'text' as const,
        content: { text: 'Hello!' },
      };

      const jobId = await inboxMessageQueue.queueOutboundMessage(jobData);

      expect(mockQueue.add).toHaveBeenCalledWith(
        InboxJobType.SEND_MESSAGE,
        expect.objectContaining({
          ...jobData,
          attempt: 1,
        }),
        expect.objectContaining({
          jobId: `inbox-msg:${messageId}`,
        })
      );
      expect(jobId).toBe('job-1');
    });

    it('should initialize attempt to 1', async () => {
      const jobData = {
        messageId,
        conversationId,
        tenantId,
        channelAccountId,
        recipient: '+1234567890',
        contentType: 'text' as const,
        content: { text: 'Hello!' },
      };

      await inboxMessageQueue.queueOutboundMessage(jobData);

      const addCall = mockQueue.add.mock.calls[0];
      expect(addCall[1].attempt).toBe(1);
    });
  });

  describe('queueInboundProcessing', () => {
    it('should add an inbound processing job to the queue', async () => {
      const jobData: ProcessInboundJobData = {
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

      expect(mockQueue.add).toHaveBeenCalledWith(
        InboxJobType.PROCESS_INBOUND,
        jobData,
        expect.objectContaining({
          jobId: expect.stringContaining('inbox-inbound:'),
        })
      );
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
  let inboxMessageQueue: InboxMessageQueue;
  let mockConversationRepo: jest.Mocked<ConversationRepository>;
  let mockMessageRepo: jest.Mocked<ConversationMessageRepository>;
  let mockCustomerRepo: jest.Mocked<CustomerRepository>;
  let mockChannelAccountRepo: jest.Mocked<ChannelAccountRepository>;
  let mockMessagingService: jest.Mocked<MessagingService>;
  let mockMetaMediaService: jest.Mocked<MetaMediaService>;
  let mockRateLimiterService: jest.Mocked<MessagingRateLimiterService>;
  let mockSseService: jest.Mocked<InboxSseService>;
  let mockMessagingWindowService: jest.Mocked<MessagingWindowService>;
  let sendMessageProcessor: (job: Bull.Job<SendMessageJobData>) => Promise<void>;
  let processInboundProcessor: (job: Bull.Job<ProcessInboundJobData>) => Promise<void>;

  const tenantId = 'tenant-123';
  const conversationId = 'conv-123';
  const messageId = 'msg-123';
  const channelAccountId = 'channel-account-123';

  const createMockMessage = (overrides: Partial<ConversationMessage> = {}): ConversationMessage =>
    ({
      id: messageId,
      tenantId,
      conversationId,
      direction: MessageDirection.OUTBOUND,
      contentType: MessageContentType.TEXT,
      content: { body: 'Hello, customer!' },
      providerMessageId: null,
      deliveryStatus: MessageDeliveryStatus.PENDING,
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
      conversation: null as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tenant: null as any,
      ...overrides,
    }) as ConversationMessage;

  const createMockConversation = (overrides: Partial<Conversation> = {}): Conversation =>
    ({
      id: conversationId,
      tenantId,
      customerId: 'customer-123',
      channelAccountId,
      assignedToId: null,
      status: ConversationStatus.ACTIVE,
      lastMessageAt: new Date(),
      lastMessagePreview: 'Previous message',
      lastMessageDirection: MessageDirection.INBOUND,
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
      tenant: null as any,
      ...overrides,
    }) as Conversation;

  const createMockChannelAccount = (
    overrides: Partial<ChannelAccount> = {}
  ): ChannelAccount =>
    ({
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
      status: ChannelAccountStatus.CONNECTED,
      lastTestedAt: new Date(),
      errorMessage: null,
      webhookUrl: null,
      webhookSecretEncrypted: null,
      webhookSecretIv: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tenant: null as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      channel: null as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      provider: null as any,
      ...overrides,
    }) as ChannelAccount;

  beforeEach(() => {
    jest.clearAllMocks();

    // Capture the processor functions when process is called
    mockQueue.process.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (jobType: string, _concurrency: number, processor: any) => {
        if (jobType === InboxJobType.SEND_MESSAGE) {
          sendMessageProcessor = processor;
        } else if (jobType === InboxJobType.PROCESS_INBOUND) {
          processInboundProcessor = processor;
        }
      }
    );

    mockConversationRepo = {
      findById: jest.fn(),
      findByCustomerAndChannel: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateLastMessage: jest.fn(),
      incrementUnreadCount: jest.fn(),
      updateLastCustomerMessageAt: jest.fn(),
    } as unknown as jest.Mocked<ConversationRepository>;

    mockMessageRepo = {
      findById: jest.fn(),
      findByProviderMessageId: jest.fn(),
      create: jest.fn(),
      updateDeliveryStatus: jest.fn(),
      updateError: jest.fn(),
      incrementRetryCount: jest.fn(),
    } as unknown as jest.Mocked<ConversationMessageRepository>;

    mockCustomerRepo = {
      findById: jest.fn(),
      findByWhatsApp: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<CustomerRepository>;

    mockChannelAccountRepo = {
      findById: jest.fn(),
      findByIdAndTenant: jest.fn(),
    } as unknown as jest.Mocked<ChannelAccountRepository>;

    mockMessagingService = {
      getProviderForChannelAccount: jest.fn(),
    } as unknown as jest.Mocked<MessagingService>;

    mockMetaMediaService = {
      processInboundMedia: jest.fn(),
      refreshMediaUrl: jest.fn(),
    } as unknown as jest.Mocked<MetaMediaService>;

    mockSseService = {
      emitToTenant: jest.fn(),
      emitConversationEvent: jest.fn(),
    } as unknown as jest.Mocked<InboxSseService>;

    mockMessagingWindowService = {
      isWindowOpen: jest.fn().mockReturnValue(true), // Window open by default
      getWindowExpiry: jest.fn(),
      getTimeRemaining: jest.fn(),
    } as unknown as jest.Mocked<MessagingWindowService>;

    mockRateLimiterService = {
      isInBackoff: jest.fn().mockResolvedValue(false),
      acquireToken: jest.fn().mockResolvedValue(true),
      handleRateLimitError: jest.fn().mockResolvedValue(undefined),
      checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 79, resetAt: new Date() }),
      isRateLimitError: jest.fn().mockReturnValue(false),
      extractRetryAfter: jest.fn().mockReturnValue(undefined),
    } as unknown as jest.Mocked<MessagingRateLimiterService>;

    inboxMessageQueue = new InboxMessageQueue(
      mockConversationRepo,
      mockMessageRepo,
      mockCustomerRepo,
      mockChannelAccountRepo,
      mockMessagingService,
      mockMetaMediaService,
      mockRateLimiterService,
      mockSseService,
      mockMessagingWindowService
    );
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
        mockProvider as any
      );

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
      } as unknown as Bull.Job<SendMessageJobData>;

      await sendMessageProcessor(mockJob);

      expect(mockProvider.sendFreeformMessage).toHaveBeenCalledWith({
        recipient: '+1234567890',
        contentType: 'text',
        content: { text: 'Hello!' },
        messageId,
      });
      expect(mockMessageRepo.updateDeliveryStatus).toHaveBeenCalledWith(
        messageId,
        MessageDeliveryStatus.SENT,
        expect.objectContaining({ sentAt: expect.any(Date) })
      );
      expect(mockSseService.emitConversationEvent).toHaveBeenCalledWith(
        tenantId,
        conversationId,
        'conversation:message:status',
        expect.objectContaining({
          messageId,
          status: MessageDeliveryStatus.SENT,
        })
      );
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
        mockProvider as any
      );

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
      } as unknown as Bull.Job<SendMessageJobData>;

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
        mockProvider as any
      );

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
      } as unknown as Bull.Job<SendMessageJobData>;

      await sendMessageProcessor(mockJob);

      expect(mockMessageRepo.updateError).toHaveBeenCalledWith(
        messageId,
        'INVALID_RECIPIENT',
        'Phone number not on WhatsApp'
      );
      expect(mockSseService.emitConversationEvent).toHaveBeenCalledWith(
        tenantId,
        conversationId,
        'conversation:message:status',
        expect.objectContaining({
          messageId,
          status: MessageDeliveryStatus.FAILED,
        })
      );
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
        mockProvider as any
      );

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
      } as unknown as Bull.Job<SendMessageJobData>;

      await sendMessageProcessor(mockJob);

      expect(mockMessageRepo.updateError).toHaveBeenCalledWith(
        messageId,
        'MAX_RETRIES_EXCEEDED',
        expect.stringContaining('retries')
      );
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
      } as unknown as Bull.Job<SendMessageJobData>;

      await expect(sendMessageProcessor(mockJob)).rejects.toThrow(
        `Message not found: ${messageId}`
      );
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
      } as unknown as Bull.Job<SendMessageJobData>;

      await expect(sendMessageProcessor(mockJob)).rejects.toThrow(
        `Channel account not found: ${channelAccountId}`
      );
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
        mockProvider as any
      );
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
      } as unknown as Bull.Job<SendMessageJobData>;

      await sendMessageProcessor(mockJob);

      expect(mockMessagingWindowService.isWindowOpen).toHaveBeenCalledWith(
        conversation.lastCustomerMessageAt
      );
      expect(mockProvider.sendFreeformMessage).not.toHaveBeenCalled();
      expect(mockMessageRepo.updateError).toHaveBeenCalledWith(
        messageId,
        'MESSAGING_WINDOW_CLOSED',
        'Cannot send freeform message outside 24-hour messaging window. Use a template message instead.'
      );
      expect(mockSseService.emitConversationEvent).toHaveBeenCalledWith(
        tenantId,
        conversationId,
        'conversation:message:status',
        expect.objectContaining({
          messageId,
          status: MessageDeliveryStatus.FAILED,
          errorCode: 'MESSAGING_WINDOW_CLOSED',
        })
      );
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
        mockProvider as any
      );
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
      } as unknown as Bull.Job<SendMessageJobData>;

      await sendMessageProcessor(mockJob);

      // Template messages bypass the window check
      expect(mockMessagingWindowService.isWindowOpen).not.toHaveBeenCalled();
      expect(mockProvider.sendTemplateMessage).toHaveBeenCalled();
      expect(mockMessageRepo.updateDeliveryStatus).toHaveBeenCalledWith(
        messageId,
        MessageDeliveryStatus.SENT,
        expect.objectContaining({ sentAt: expect.any(Date) })
      );
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
        mockProvider as any
      );
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
      } as unknown as Bull.Job<SendMessageJobData>;

      await sendMessageProcessor(mockJob);

      expect(mockMessagingWindowService.isWindowOpen).toHaveBeenCalledWith(
        conversation.lastCustomerMessageAt
      );
      expect(mockProvider.sendFreeformMessage).toHaveBeenCalled();
      expect(mockMessageRepo.updateDeliveryStatus).toHaveBeenCalledWith(
        messageId,
        MessageDeliveryStatus.SENT,
        expect.objectContaining({ sentAt: expect.any(Date) })
      );
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
        customer as any
      );
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
      } as unknown as Bull.Job<ProcessInboundJobData>;

      await processInboundProcessor(mockJob);

      expect(mockMessageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          conversationId,
          direction: MessageDirection.INBOUND,
          providerMessageId: 'provider-msg-123',
        })
      );
      expect(mockConversationRepo.updateLastMessage).toHaveBeenCalled();
      // Verify lastCustomerMessageAt is updated for 24-hour messaging window tracking
      expect(mockConversationRepo.updateLastCustomerMessageAt).toHaveBeenCalledWith(
        tenantId,
        conversationId,
        expect.any(Date)
      );
      expect(mockConversationRepo.incrementUnreadCount).toHaveBeenCalled();
      expect(mockSseService.emitConversationEvent).toHaveBeenCalledWith(
        tenantId,
        conversationId,
        'conversation:message:new',
        expect.any(Object)
      );
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
        newCustomer as any
      );
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
      } as unknown as Bull.Job<ProcessInboundJobData>;

      await processInboundProcessor(mockJob);

      expect(mockCustomerRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          whatsappNumber: '+1234567890',
          name: '+1234567890',
        })
      );
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
        customer as any
      );
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
      } as unknown as Bull.Job<ProcessInboundJobData>;

      await processInboundProcessor(mockJob);

      expect(mockConversationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          customerId: customer.id,
          channelAccountId,
          status: ConversationStatus.UNASSIGNED,
        })
      );
      expect(mockSseService.emitToTenant).toHaveBeenCalledWith(
        tenantId,
        'conversation:new',
        expect.any(Object)
      );
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
      } as unknown as Bull.Job<ProcessInboundJobData>;

      await expect(processInboundProcessor(mockJob)).rejects.toThrow(
        `Channel account not found: ${channelAccountId}`
      );
    });
  });
});
