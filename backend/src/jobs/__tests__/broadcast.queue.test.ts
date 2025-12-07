import 'reflect-metadata';
import Bull from 'bull';
import { BroadcastQueue, JobType, SendBroadcastJobData, ProcessRecipientJobData } from '../broadcast.queue';
import { BroadcastRepository } from '../../features/broadcasts/broadcast.repository';
import { BroadcastSseService } from '../../features/broadcasts/broadcast-sse.service';
import { GroupRepository } from '../../features/groups/group.repository';
import { CustomerRepository } from '../../features/customers/customer.repository';
import { MessagingService } from '../../features/messaging/services/messaging.service';
import { MessagingRateLimiterService } from '../../features/messaging/services/rate-limiter.service';
import { ChannelAccountRepository } from '../../features/channel-accounts/channel-account.repository';
import { Broadcast } from '../../features/broadcasts/broadcast.entity';
import { BroadcastStatus, RecipientType } from '../../features/broadcasts/enums';
import { TemplateCategory } from '../../features/templates/enums';

// Mock Bull queue
const mockQueue = {
  process: jest.fn(),
  add: jest.fn().mockResolvedValue({ id: 'job-1' }),
  on: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
  getJob: jest.fn(),
  getJobs: jest.fn(),
  removeJobs: jest.fn().mockResolvedValue(undefined),
  getJobCounts: jest.fn().mockResolvedValue({ waiting: 0, active: 0, completed: 0, failed: 0 }),
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

describe('BroadcastQueue', () => {
  let broadcastQueue: BroadcastQueue;
  let mockBroadcastRepository: jest.Mocked<BroadcastRepository>;
  let mockSseService: jest.Mocked<BroadcastSseService>;
  let mockGroupRepository: jest.Mocked<GroupRepository>;
  let mockCustomerRepository: jest.Mocked<CustomerRepository>;
  let mockMessagingService: jest.Mocked<MessagingService>;
  let mockChannelAccountRepository: jest.Mocked<ChannelAccountRepository>;
  let mockRateLimiterService: jest.Mocked<MessagingRateLimiterService>;

  const tenantId = 'tenant-123';
  const userId = 'user-123';

  const createMockBroadcast = (overrides: Partial<Broadcast> = {}): Broadcast => ({
    id: 'broadcast-1',
    tenantId,
    name: 'Test Broadcast',
    description: 'Test description',
    templateId: 'template-1',
    templateName: 'Welcome Template',
    templateCategory: TemplateCategory.MARKETING,
    templateLanguage: 'en',
    recipientType: RecipientType.GROUP,
    groupId: 'group-1',
    customerIds: null,
    totalRecipients: 100,
    templateVariables: {
      header: undefined,
      bodyVariables: [{ index: 0, sourceType: 'static', staticValue: 'Hello' }],
      buttonVariables: [],
    },
    scheduledAt: new Date(Date.now() + 86400000),
    isImmediate: false,
    timezone: 'UTC',
    status: BroadcastStatus.DRAFT,
    sentCount: 0,
    deliveredCount: 0,
    readCount: 0,
    failedCount: 0,
    createdBy: userId,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    startedAt: null,
    completedAt: null,
    previousStatus: null,
    customFields: {},
    tenant: null as any,
    channelAccountId: null,
    channelAccount: null,
    template: null,
    group: null,
    creator: null,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockBroadcastRepository = {
      findById: jest.fn(),
      findByIds: jest.fn(),
      update: jest.fn(),
      findScheduledBroadcasts: jest.fn(),
      incrementMetric: jest.fn(),
      markCompleted: jest.fn(),
      markCompletedAtomic: jest.fn().mockResolvedValue({ success: true, wasUpdated: false }),
    } as unknown as jest.Mocked<BroadcastRepository>;

    mockSseService = {
      emitProgress: jest.fn(),
    } as unknown as jest.Mocked<BroadcastSseService>;

    mockGroupRepository = {
      findById: jest.fn(),
      getMemberIds: jest.fn(),
      getMembers: jest.fn(),
    } as unknown as jest.Mocked<GroupRepository>;

    mockCustomerRepository = {
      findById: jest.fn(),
      findByIds: jest.fn(),
    } as unknown as jest.Mocked<CustomerRepository>;

    mockMessagingService = {
      sendTemplateMessage: jest.fn(),
    } as unknown as jest.Mocked<MessagingService>;

    mockChannelAccountRepository = {
      findById: jest.fn(),
      findPrimaryByTenantAndChannel: jest.fn().mockResolvedValue({
        id: 'channel-account-1',
        tenantId,
        channelId: 'whatsapp-channel-1',
        providerId: 'meta-provider-1',
        isPrimary: true,
        isActive: true,
      }),
    } as unknown as jest.Mocked<ChannelAccountRepository>;

    mockRateLimiterService = {
      isInBackoff: jest.fn().mockResolvedValue(false),
      acquireToken: jest.fn().mockResolvedValue(true),
      handleRateLimitError: jest.fn().mockResolvedValue(undefined),
      checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 79, resetAt: new Date() }),
      isRateLimitError: jest.fn().mockReturnValue(false),
      extractRetryAfter: jest.fn().mockReturnValue(undefined),
    } as unknown as jest.Mocked<MessagingRateLimiterService>;

    broadcastQueue = new BroadcastQueue(
      mockBroadcastRepository,
      mockSseService,
      mockGroupRepository,
      mockCustomerRepository,
      mockMessagingService,
      mockChannelAccountRepository,
      mockRateLimiterService
    );
  });

  describe('scheduleBroadcast', () => {
    it('should add a job with delay for scheduled broadcasts', async () => {
      const broadcastId = 'broadcast-1';
      const scheduledAt = new Date(Date.now() + 60000); // 1 minute from now

      await broadcastQueue.scheduleBroadcast(broadcastId, tenantId, scheduledAt);

      expect(mockQueue.add).toHaveBeenCalledWith(
        JobType.SEND_BROADCAST,
        { broadcastId, tenantId },
        expect.objectContaining({
          delay: expect.any(Number),
          jobId: `broadcast:${broadcastId}`,
        })
      );
    });

    it('should not schedule if scheduledAt is in the past', async () => {
      const broadcastId = 'broadcast-1';
      const scheduledAt = new Date(Date.now() - 60000); // 1 minute ago

      await expect(
        broadcastQueue.scheduleBroadcast(broadcastId, tenantId, scheduledAt)
      ).rejects.toThrow('Scheduled time must be in the future');

      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('sendBroadcastNow', () => {
    it('should add a job for immediate processing', async () => {
      const broadcastId = 'broadcast-1';

      await broadcastQueue.sendBroadcastNow(broadcastId, tenantId);

      expect(mockQueue.add).toHaveBeenCalledWith(
        JobType.SEND_BROADCAST,
        { broadcastId, tenantId },
        expect.objectContaining({
          jobId: `broadcast:${broadcastId}`,
        })
      );
    });

    it('should not have delay for immediate processing', async () => {
      const broadcastId = 'broadcast-1';

      await broadcastQueue.sendBroadcastNow(broadcastId, tenantId);

      const addCall = mockQueue.add.mock.calls[0];
      expect(addCall[2].delay).toBeUndefined();
    });
  });

  describe('cancelScheduledBroadcast', () => {
    it('should remove the scheduled job', async () => {
      const broadcastId = 'broadcast-1';

      const result = await broadcastQueue.cancelScheduledBroadcast(broadcastId);

      expect(mockQueue.removeJobs).toHaveBeenCalledWith(`broadcast:${broadcastId}`);
      expect(result).toBe(true);
    });

    it('should return true even if no job existed', async () => {
      const broadcastId = 'nonexistent';

      const result = await broadcastQueue.cancelScheduledBroadcast(broadcastId);

      expect(result).toBe(true);
    });
  });

  describe('pauseQueue', () => {
    it('should pause the queue', async () => {
      await broadcastQueue.pauseQueue();

      expect(mockQueue.pause).toHaveBeenCalled();
    });
  });

  describe('resumeQueue', () => {
    it('should resume the queue', async () => {
      await broadcastQueue.resumeQueue();

      expect(mockQueue.resume).toHaveBeenCalled();
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

      const stats = await broadcastQueue.getQueueStats();

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
      await broadcastQueue.closeQueue();

      expect(mockQueue.close).toHaveBeenCalled();
    });
  });

  describe('checkScheduledBroadcasts', () => {
    it('should find and enqueue scheduled broadcasts that are due', async () => {
      const broadcast = createMockBroadcast({
        status: BroadcastStatus.SCHEDULED,
        scheduledAt: new Date(Date.now() - 1000), // 1 second ago
      });

      mockBroadcastRepository.findScheduledBroadcasts.mockResolvedValue([broadcast]);

      await broadcastQueue.checkScheduledBroadcasts();

      expect(mockBroadcastRepository.findScheduledBroadcasts).toHaveBeenCalledWith(
        expect.any(Date)
      );
      expect(mockQueue.add).toHaveBeenCalled();
    });

    it('should not enqueue anything when no broadcasts are due', async () => {
      mockBroadcastRepository.findScheduledBroadcasts.mockResolvedValue([]);

      await broadcastQueue.checkScheduledBroadcasts();

      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });
});

describe('BroadcastQueue Job Processors', () => {
  let broadcastQueue: BroadcastQueue;
  let mockBroadcastRepository: jest.Mocked<BroadcastRepository>;
  let mockSseService: jest.Mocked<BroadcastSseService>;
  let mockGroupRepository: jest.Mocked<GroupRepository>;
  let mockCustomerRepository: jest.Mocked<CustomerRepository>;
  let mockMessagingService: jest.Mocked<MessagingService>;
  let mockChannelAccountRepository: jest.Mocked<ChannelAccountRepository>;
  let mockRateLimiterService: jest.Mocked<MessagingRateLimiterService>;
  let sendBroadcastProcessor: (job: Bull.Job<SendBroadcastJobData>) => Promise<void>;
  let processRecipientProcessor: (job: Bull.Job<ProcessRecipientJobData>) => Promise<void>;

  const tenantId = 'tenant-123';
  const userId = 'user-123';

  const createMockBroadcast = (overrides: Partial<Broadcast> = {}): Broadcast => ({
    id: 'broadcast-1',
    tenantId,
    name: 'Test Broadcast',
    description: 'Test description',
    templateId: 'template-1',
    templateName: 'Welcome Template',
    templateCategory: TemplateCategory.MARKETING,
    templateLanguage: 'en',
    recipientType: RecipientType.GROUP,
    groupId: 'group-1',
    customerIds: null,
    totalRecipients: 2,
    templateVariables: {
      header: undefined,
      bodyVariables: [{ index: 0, sourceType: 'static', staticValue: 'Hello' }],
      buttonVariables: [],
    },
    scheduledAt: null,
    isImmediate: true,
    timezone: 'UTC',
    status: BroadcastStatus.SENDING,
    sentCount: 0,
    deliveredCount: 0,
    readCount: 0,
    failedCount: 0,
    createdBy: userId,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    startedAt: new Date(),
    completedAt: null,
    previousStatus: null,
    customFields: {},
    tenant: null as any,
    channelAccountId: null,
    channelAccount: null,
    template: null,
    group: null,
    creator: null,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Capture the processor functions when process is called
    mockQueue.process.mockImplementation((jobType: string, _concurrency: number, processor: any) => {
      if (jobType === JobType.SEND_BROADCAST) {
        sendBroadcastProcessor = processor;
      } else if (jobType === JobType.PROCESS_RECIPIENT) {
        processRecipientProcessor = processor;
      }
    });

    mockBroadcastRepository = {
      findById: jest.fn(),
      findByIds: jest.fn(),
      update: jest.fn(),
      findScheduledBroadcasts: jest.fn(),
      incrementMetric: jest.fn(),
      markCompleted: jest.fn(),
      markCompletedAtomic: jest.fn().mockResolvedValue({ success: true, wasUpdated: false }),
    } as unknown as jest.Mocked<BroadcastRepository>;

    mockSseService = {
      emitProgress: jest.fn(),
    } as unknown as jest.Mocked<BroadcastSseService>;

    mockGroupRepository = {
      findById: jest.fn(),
      getMemberIds: jest.fn(),
      getMembers: jest.fn(),
    } as unknown as jest.Mocked<GroupRepository>;

    mockCustomerRepository = {
      findById: jest.fn(),
      findByIds: jest.fn(),
    } as unknown as jest.Mocked<CustomerRepository>;

    mockMessagingService = {
      sendTemplateMessage: jest.fn().mockResolvedValue({
        success: true,
        messageLogId: 'msg-log-123',
        providerMessageId: 'provider-msg-123',
      }),
    } as unknown as jest.Mocked<MessagingService>;

    mockChannelAccountRepository = {
      findById: jest.fn(),
      findPrimaryByTenantAndChannel: jest.fn().mockResolvedValue({
        id: 'channel-account-1',
        tenantId,
        channelId: 'whatsapp-channel-1',
        providerId: 'meta-provider-1',
        isPrimary: true,
        isActive: true,
      }),
    } as unknown as jest.Mocked<ChannelAccountRepository>;

    mockRateLimiterService = {
      isInBackoff: jest.fn().mockResolvedValue(false),
      acquireToken: jest.fn().mockResolvedValue(true),
      handleRateLimitError: jest.fn().mockResolvedValue(undefined),
      checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 79, resetAt: new Date() }),
      isRateLimitError: jest.fn().mockReturnValue(false),
      extractRetryAfter: jest.fn().mockReturnValue(undefined),
    } as unknown as jest.Mocked<MessagingRateLimiterService>;

    broadcastQueue = new BroadcastQueue(
      mockBroadcastRepository,
      mockSseService,
      mockGroupRepository,
      mockCustomerRepository,
      mockMessagingService,
      mockChannelAccountRepository,
      mockRateLimiterService
    );
  });

  describe('SEND_BROADCAST processor', () => {
    it('should resolve recipients from a group and add individual jobs', async () => {
      const broadcast = createMockBroadcast({
        recipientType: RecipientType.GROUP,
        groupId: 'group-1',
        totalRecipients: 2,
        status: BroadcastStatus.SCHEDULED, // Not yet SENDING
      });

      mockBroadcastRepository.findById.mockResolvedValue(broadcast);
      mockGroupRepository.getMembers.mockResolvedValue({
        data: [
          { id: 'customer-1', name: 'John', whatsappNumber: '+1234567890', tenantId, customFields: {}, tags: [], createdAt: new Date(), updatedAt: new Date(), tenant: null as any },
          { id: 'customer-2', name: 'Jane', whatsappNumber: '+0987654321', tenantId, customFields: {}, tags: [], createdAt: new Date(), updatedAt: new Date(), tenant: null as any },
        ],
        total: 2,
        page: 1,
        limit: 1000,
        totalPages: 1,
      });
      mockBroadcastRepository.update.mockResolvedValue(broadcast);

      const mockJob = {
        data: { broadcastId: 'broadcast-1', tenantId },
        id: 'job-1',
        progress: jest.fn(),
      } as unknown as Bull.Job<SendBroadcastJobData>;

      await sendBroadcastProcessor(mockJob);

      expect(mockBroadcastRepository.update).toHaveBeenCalledWith(
        'broadcast-1',
        tenantId,
        expect.objectContaining({ status: BroadcastStatus.SENDING })
      );
      expect(mockQueue.add).toHaveBeenCalledTimes(2);
    });

    it('should resolve recipients from customerIds', async () => {
      const broadcast = createMockBroadcast({
        recipientType: RecipientType.CUSTOMERS,
        groupId: null,
        customerIds: ['customer-1', 'customer-2'],
        totalRecipients: 2,
      });

      mockBroadcastRepository.findById.mockResolvedValue(broadcast);
      // Now using batch findByIds instead of individual findById calls
      mockCustomerRepository.findByIds.mockResolvedValue([
        { id: 'customer-1', name: 'John', whatsappNumber: '+1234567890', tenantId, customFields: {}, tags: [], createdAt: new Date(), updatedAt: new Date() } as any,
        { id: 'customer-2', name: 'Jane', whatsappNumber: '+0987654321', tenantId, customFields: {}, tags: [], createdAt: new Date(), updatedAt: new Date() } as any,
      ]);
      mockBroadcastRepository.update.mockResolvedValue(broadcast);

      const mockJob = {
        data: { broadcastId: 'broadcast-1', tenantId },
        id: 'job-1',
        progress: jest.fn(),
      } as unknown as Bull.Job<SendBroadcastJobData>;

      await sendBroadcastProcessor(mockJob);

      // Verify batch lookup was used instead of N+1 individual lookups
      expect(mockCustomerRepository.findByIds).toHaveBeenCalledWith(
        ['customer-1', 'customer-2'],
        tenantId
      );
      expect(mockQueue.add).toHaveBeenCalledTimes(2);
    });

    it('should skip processing if broadcast is not found', async () => {
      mockBroadcastRepository.findById.mockResolvedValue(null);

      const mockJob = {
        data: { broadcastId: 'nonexistent', tenantId },
        id: 'job-1',
        progress: jest.fn(),
      } as unknown as Bull.Job<SendBroadcastJobData>;

      await expect(sendBroadcastProcessor(mockJob)).rejects.toThrow('Broadcast not found');
    });

    it('should skip processing if broadcast is paused', async () => {
      const broadcast = createMockBroadcast({
        status: BroadcastStatus.PAUSED,
      });

      mockBroadcastRepository.findById.mockResolvedValue(broadcast);

      const mockJob = {
        data: { broadcastId: 'broadcast-1', tenantId },
        id: 'job-1',
        progress: jest.fn(),
      } as unknown as Bull.Job<SendBroadcastJobData>;

      await sendBroadcastProcessor(mockJob);

      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('PROCESS_RECIPIENT processor', () => {
    it('should simulate sending and increment sent count', async () => {
      const broadcast = createMockBroadcast({
        status: BroadcastStatus.SENDING,
        totalRecipients: 2,
        sentCount: 0,
      });

      mockBroadcastRepository.findById.mockResolvedValue(broadcast);
      mockBroadcastRepository.incrementMetric.mockResolvedValue();

      const mockJob = {
        data: {
          broadcastId: 'broadcast-1',
          tenantId,
          channelAccountId: 'channel-account-1',
          templateName: 'Welcome Template',
          templateLanguage: 'en',
          templateVariables: {
            header: undefined,
            bodyVariables: [{ index: 0, sourceType: 'static', staticValue: 'Hello' }],
            buttonVariables: [],
          },
          customerId: 'customer-1',
          customerPhone: '+1234567890',
          customerName: 'John',
          customerFields: {},
        },
        id: 'job-2',
        progress: jest.fn(),
      } as unknown as Bull.Job<ProcessRecipientJobData>;

      await processRecipientProcessor(mockJob);

      expect(mockBroadcastRepository.incrementMetric).toHaveBeenCalledWith(
        'broadcast-1',
        'sentCount',
        1
      );
      expect(mockSseService.emitProgress).toHaveBeenCalled();
    });

    it('should mark broadcast as completed when all recipients processed', async () => {
      const broadcast = createMockBroadcast({
        status: BroadcastStatus.SENDING,
        totalRecipients: 1,
        sentCount: 1, // Already processed (simulating post-increment state)
      });

      // Mock atomic completion - returns wasUpdated: true when this worker completes the broadcast
      mockBroadcastRepository.markCompletedAtomic.mockResolvedValue({
        success: true,
        wasUpdated: true,
      });
      // After sending, findById is called to check progress - return with sentCount=1
      mockBroadcastRepository.findById.mockResolvedValue(broadcast);
      mockBroadcastRepository.incrementMetric.mockResolvedValue();

      const mockJob = {
        data: {
          broadcastId: 'broadcast-1',
          tenantId,
          channelAccountId: 'channel-account-1',
          templateName: 'Welcome Template',
          templateLanguage: 'en',
          templateVariables: {
            header: undefined,
            bodyVariables: [{ index: 0, sourceType: 'static', staticValue: 'Hello' }],
            buttonVariables: [],
          },
          customerId: 'customer-1',
          customerPhone: '+1234567890',
          customerName: 'John',
          customerFields: {},
        },
        id: 'job-2',
        progress: jest.fn(),
      } as unknown as Bull.Job<ProcessRecipientJobData>;

      await processRecipientProcessor(mockJob);

      // Verify atomic completion was called
      expect(mockBroadcastRepository.markCompletedAtomic).toHaveBeenCalledWith('broadcast-1', tenantId);
    });

    it('should emit SSE progress update', async () => {
      const broadcast = createMockBroadcast({
        status: BroadcastStatus.SENDING,
        totalRecipients: 10,
        sentCount: 5,
      });

      mockBroadcastRepository.findById.mockResolvedValue(broadcast);
      mockBroadcastRepository.incrementMetric.mockResolvedValue();

      const mockJob = {
        data: {
          broadcastId: 'broadcast-1',
          tenantId,
          channelAccountId: 'channel-account-1',
          templateName: 'Welcome Template',
          templateLanguage: 'en',
          templateVariables: {
            header: undefined,
            bodyVariables: [{ index: 0, sourceType: 'static', staticValue: 'Hello' }],
            buttonVariables: [],
          },
          customerId: 'customer-1',
          customerPhone: '+1234567890',
          customerName: 'John',
          customerFields: {},
        },
        id: 'job-2',
        progress: jest.fn(),
      } as unknown as Bull.Job<ProcessRecipientJobData>;

      await processRecipientProcessor(mockJob);

      expect(mockSseService.emitProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          broadcastId: 'broadcast-1',
        })
      );
    });
  });
});
