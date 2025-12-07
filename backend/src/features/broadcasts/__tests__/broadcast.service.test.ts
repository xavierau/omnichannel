import 'reflect-metadata';
import { BroadcastService } from '../broadcast.service';
import { BroadcastRepository } from '../broadcast.repository';
import { TemplateRepository } from '../../templates/template.repository';
import { GroupRepository } from '../../groups/group.repository';
import { CustomerRepository } from '../../customers/customer.repository';
import { BroadcastQueue } from '../../../jobs/broadcast.queue';
import { Broadcast, TemplateVariablesConfig } from '../broadcast.entity';
import { BroadcastStatus, RecipientType } from '../enums';
import { TemplateCategory } from '../../templates/enums';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '../../../shared/exceptions/http-exceptions';

// Mock the auditLogger
jest.mock('../../../config/logger.config', () => ({
  auditLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock BroadcastQueue
jest.mock('../../../jobs/broadcast.queue', () => ({
  BroadcastQueue: jest.fn().mockImplementation(() => ({
    scheduleBroadcast: jest.fn().mockResolvedValue(undefined),
    sendBroadcastNow: jest.fn().mockResolvedValue(undefined),
    cancelScheduledBroadcast: jest.fn().mockResolvedValue(true),
  })),
}));

// Mock the report presenter
jest.mock('../broadcast-report.presenter', () => ({
  toBroadcastReportResponse: jest.fn((broadcast) => ({
    id: broadcast.id,
    name: broadcast.name,
    status: broadcast.status,
    templateName: broadcast.templateName,
    totalRecipients: broadcast.totalRecipients,
    metrics: {
      sent: broadcast.sentCount,
      delivered: broadcast.deliveredCount,
      read: broadcast.readCount,
      failed: broadcast.failedCount,
      pending: broadcast.totalRecipients - broadcast.sentCount,
    },
    rates: {
      deliveryRate: broadcast.sentCount > 0 ? (broadcast.deliveredCount / broadcast.sentCount) * 100 : 0,
      readRate: broadcast.deliveredCount > 0 ? (broadcast.readCount / broadcast.deliveredCount) * 100 : 0,
      failureRate: broadcast.sentCount > 0 ? (broadcast.failedCount / broadcast.sentCount) * 100 : 0,
    },
    scheduledAt: broadcast.scheduledAt,
    startedAt: broadcast.startedAt,
    completedAt: broadcast.completedAt,
    duration: null,
  })),
}));

describe('BroadcastService - Action Methods', () => {
  let broadcastService: BroadcastService;
  let mockBroadcastRepository: jest.Mocked<BroadcastRepository>;
  let mockTemplateRepository: jest.Mocked<TemplateRepository>;
  let mockGroupRepository: jest.Mocked<GroupRepository>;
  let mockCustomerRepository: jest.Mocked<CustomerRepository>;
  let mockBroadcastQueue: jest.Mocked<BroadcastQueue>;

  const tenantId = 'tenant-123';
  const userId = 'user-123';

  // Test fixtures
  const mockTemplateVariables: TemplateVariablesConfig = {
    header: undefined,
    bodyVariables: [
      { index: 0, sourceType: 'static', staticValue: 'Hello' },
    ],
    buttonVariables: [],
  };

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
    templateVariables: mockTemplateVariables,
    scheduledAt: new Date(Date.now() + 86400000), // Tomorrow
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
    channelAccountId: null,
    channelAccount: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tenant: null as any,
    template: null,
    group: null,
    creator: null,
    ...overrides,
  });

  beforeEach(() => {
    // Create mock repository instances
    mockBroadcastRepository = {
      findById: jest.fn(),
      findByIds: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      bulkDelete: jest.fn(),
      bulkUpdateStatus: jest.fn(),
      findScheduledBroadcasts: jest.fn(),
      updateMetrics: jest.fn(),
      incrementMetric: jest.fn(),
      existsByName: jest.fn(),
      markCompleted: jest.fn(),
      updateStatusWithLock: jest.fn(),
      bulkPauseWithTransaction: jest.fn(),
      bulkCancelWithTransaction: jest.fn(),
      bulkDeleteWithTransaction: jest.fn(),
    } as unknown as jest.Mocked<BroadcastRepository>;

    mockTemplateRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<TemplateRepository>;

    mockGroupRepository = {
      findById: jest.fn(),
      getMemberCount: jest.fn(),
      validateCustomerIds: jest.fn(),
    } as unknown as jest.Mocked<GroupRepository>;

    mockCustomerRepository = {} as unknown as jest.Mocked<CustomerRepository>;

    mockBroadcastQueue = {
      scheduleBroadcast: jest.fn().mockResolvedValue(undefined),
      sendBroadcastNow: jest.fn().mockResolvedValue(undefined),
      cancelScheduledBroadcast: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<BroadcastQueue>;

    // Create service instance with mocked dependencies
    broadcastService = new BroadcastService(
      mockBroadcastRepository,
      mockTemplateRepository,
      mockGroupRepository,
      mockCustomerRepository,
      mockBroadcastQueue
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('schedule', () => {
    it('should schedule a DRAFT broadcast successfully', async () => {
      const broadcast = createMockBroadcast({
        status: BroadcastStatus.DRAFT,
        scheduledAt: new Date(Date.now() + 86400000),
      });

      const scheduledBroadcast = createMockBroadcast({
        ...broadcast,
        status: BroadcastStatus.SCHEDULED,
      });

      mockBroadcastRepository.findById.mockResolvedValue(broadcast);
      mockBroadcastRepository.updateStatusWithLock.mockResolvedValue(scheduledBroadcast);

      const result = await broadcastService.schedule(broadcast.id, tenantId, userId, true);

      expect(mockBroadcastRepository.findById).toHaveBeenCalledWith(tenantId, broadcast.id);
      expect(mockBroadcastRepository.updateStatusWithLock).toHaveBeenCalledWith(
        broadcast.id,
        tenantId,
        [BroadcastStatus.DRAFT],
        BroadcastStatus.SCHEDULED
      );
      expect(result.status).toBe(BroadcastStatus.SCHEDULED);
    });

    it('should throw ConflictException if broadcast is not DRAFT', async () => {
      const broadcast = createMockBroadcast({
        status: BroadcastStatus.SENDING,
        scheduledAt: new Date(Date.now() + 86400000),
      });

      mockBroadcastRepository.findById.mockResolvedValue(broadcast);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ConflictException } = require('../../../shared/exceptions/http-exceptions');
      mockBroadcastRepository.updateStatusWithLock.mockRejectedValue(
        new ConflictException(
          'Cannot transition broadcast from "sending" to "scheduled". Expected status: draft.'
        )
      );

      await expect(
        broadcastService.schedule(broadcast.id, tenantId, userId, true)
      ).rejects.toThrow('Cannot transition broadcast');

      expect(mockBroadcastRepository.updateStatusWithLock).toHaveBeenCalled();
    });

    it('should throw BadRequestException if scheduledAt is not set', async () => {
      const broadcast = createMockBroadcast({
        status: BroadcastStatus.DRAFT,
        scheduledAt: null,
      });

      mockBroadcastRepository.findById.mockResolvedValue(broadcast);

      await expect(
        broadcastService.schedule(broadcast.id, tenantId, userId, true)
      ).rejects.toThrow(BadRequestException);

      await expect(
        broadcastService.schedule(broadcast.id, tenantId, userId, true)
      ).rejects.toThrow('without a scheduled time');
    });

    it('should throw BadRequestException if scheduledAt is in the past', async () => {
      const broadcast = createMockBroadcast({
        status: BroadcastStatus.DRAFT,
        scheduledAt: new Date(Date.now() - 86400000), // Yesterday
      });

      mockBroadcastRepository.findById.mockResolvedValue(broadcast);

      await expect(
        broadcastService.schedule(broadcast.id, tenantId, userId, true)
      ).rejects.toThrow(BadRequestException);

      await expect(
        broadcastService.schedule(broadcast.id, tenantId, userId, true)
      ).rejects.toThrow('must be in the future');
    });

    it('should throw NotFoundException if broadcast not found', async () => {
      mockBroadcastRepository.findById.mockResolvedValue(null);

      await expect(
        broadcastService.schedule('nonexistent', tenantId, userId, true)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('sendNow', () => {
    it('should send a DRAFT broadcast immediately', async () => {
      const broadcast = createMockBroadcast({
        status: BroadcastStatus.DRAFT,
      });

      const sendingBroadcast = createMockBroadcast({
        ...broadcast,
        status: BroadcastStatus.SENDING,
        isImmediate: true,
        startedAt: expect.any(Date),
      });

      mockBroadcastRepository.findById.mockResolvedValue(broadcast);
      mockBroadcastRepository.updateStatusWithLock.mockResolvedValue(sendingBroadcast);

      const result = await broadcastService.sendNow(broadcast.id, tenantId, userId, true);

      expect(mockBroadcastRepository.updateStatusWithLock).toHaveBeenCalledWith(
        broadcast.id,
        tenantId,
        [BroadcastStatus.DRAFT],
        BroadcastStatus.SENDING,
        expect.objectContaining({
          isImmediate: true,
          startedAt: expect.any(Date),
        })
      );
      expect(result.status).toBe(BroadcastStatus.SENDING);
    });

    it('should throw ConflictException if broadcast is not DRAFT', async () => {
      const broadcast = createMockBroadcast({
        status: BroadcastStatus.SCHEDULED,
      });

      mockBroadcastRepository.findById.mockResolvedValue(broadcast);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ConflictException } = require('../../../shared/exceptions/http-exceptions');
      mockBroadcastRepository.updateStatusWithLock.mockRejectedValue(
        new ConflictException(
          'Cannot transition broadcast from "scheduled" to "sending". Expected status: draft.'
        )
      );

      await expect(
        broadcastService.sendNow(broadcast.id, tenantId, userId, true)
      ).rejects.toThrow('Cannot transition broadcast');

      expect(mockBroadcastRepository.updateStatusWithLock).toHaveBeenCalled();
    });
  });

  describe('pause', () => {
    it('should pause a SCHEDULED broadcast', async () => {
      const broadcast = createMockBroadcast({
        status: BroadcastStatus.SCHEDULED,
      });

      const pausedBroadcast = createMockBroadcast({
        ...broadcast,
        status: BroadcastStatus.PAUSED,
        previousStatus: BroadcastStatus.SCHEDULED,
      });

      mockBroadcastRepository.findById.mockResolvedValue(broadcast);
      mockBroadcastRepository.updateStatusWithLock.mockResolvedValue(pausedBroadcast);

      const result = await broadcastService.pause(broadcast.id, tenantId, userId, true);

      expect(mockBroadcastRepository.updateStatusWithLock).toHaveBeenCalledWith(
        broadcast.id,
        tenantId,
        [BroadcastStatus.SCHEDULED, BroadcastStatus.SENDING],
        BroadcastStatus.PAUSED,
        { previousStatus: broadcast.status }
      );
      expect(result.status).toBe(BroadcastStatus.PAUSED);
    });

    it('should pause a SENDING broadcast', async () => {
      const broadcast = createMockBroadcast({
        status: BroadcastStatus.SENDING,
      });

      const pausedBroadcast = createMockBroadcast({
        ...broadcast,
        status: BroadcastStatus.PAUSED,
        previousStatus: BroadcastStatus.SENDING,
      });

      mockBroadcastRepository.findById.mockResolvedValue(broadcast);
      mockBroadcastRepository.updateStatusWithLock.mockResolvedValue(pausedBroadcast);

      const result = await broadcastService.pause(broadcast.id, tenantId, userId, true);

      expect(mockBroadcastRepository.updateStatusWithLock).toHaveBeenCalledWith(
        broadcast.id,
        tenantId,
        [BroadcastStatus.SCHEDULED, BroadcastStatus.SENDING],
        BroadcastStatus.PAUSED,
        { previousStatus: broadcast.status }
      );
      expect(result.status).toBe(BroadcastStatus.PAUSED);
    });

    it('should throw ConflictException if broadcast cannot be paused', async () => {
      const broadcast = createMockBroadcast({
        status: BroadcastStatus.DRAFT,
      });

      mockBroadcastRepository.findById.mockResolvedValue(broadcast);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ConflictException } = require('../../../shared/exceptions/http-exceptions');
      mockBroadcastRepository.updateStatusWithLock.mockRejectedValue(
        new ConflictException(
          'Cannot transition broadcast from "draft" to "paused".'
        )
      );

      await expect(
        broadcastService.pause(broadcast.id, tenantId, userId, true)
      ).rejects.toThrow('Cannot transition broadcast');
    });

    it('should throw ConflictException if broadcast is already completed', async () => {
      const broadcast = createMockBroadcast({
        status: BroadcastStatus.COMPLETED,
      });

      mockBroadcastRepository.findById.mockResolvedValue(broadcast);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ConflictException: ConflictExc } = require('../../../shared/exceptions/http-exceptions');
      mockBroadcastRepository.updateStatusWithLock.mockRejectedValue(
        new ConflictExc(
          'Cannot transition broadcast from "completed" to "paused".'
        )
      );

      await expect(
        broadcastService.pause(broadcast.id, tenantId, userId, true)
      ).rejects.toThrow('Cannot transition broadcast');
    });
  });

  describe('resume', () => {
    it('should resume a paused broadcast that was SCHEDULED', async () => {
      const broadcast = createMockBroadcast({
        status: BroadcastStatus.PAUSED,
        previousStatus: BroadcastStatus.SCHEDULED,
      });

      const resumedBroadcast = createMockBroadcast({
        ...broadcast,
        status: BroadcastStatus.SCHEDULED,
        previousStatus: null,
      });

      mockBroadcastRepository.findById.mockResolvedValue(broadcast);
      mockBroadcastRepository.updateStatusWithLock.mockResolvedValue(resumedBroadcast);

      const result = await broadcastService.resume(broadcast.id, tenantId, userId, true);

      expect(mockBroadcastRepository.updateStatusWithLock).toHaveBeenCalledWith(
        broadcast.id,
        tenantId,
        [BroadcastStatus.PAUSED],
        BroadcastStatus.SCHEDULED,
        { previousStatus: null }
      );
      expect(result.status).toBe(BroadcastStatus.SCHEDULED);
    });

    it('should resume a paused broadcast that was SENDING', async () => {
      const broadcast = createMockBroadcast({
        status: BroadcastStatus.PAUSED,
        previousStatus: BroadcastStatus.SENDING,
      });

      const resumedBroadcast = createMockBroadcast({
        ...broadcast,
        status: BroadcastStatus.SENDING,
        previousStatus: null,
      });

      mockBroadcastRepository.findById.mockResolvedValue(broadcast);
      mockBroadcastRepository.updateStatusWithLock.mockResolvedValue(resumedBroadcast);

      const result = await broadcastService.resume(broadcast.id, tenantId, userId, true);

      expect(mockBroadcastRepository.updateStatusWithLock).toHaveBeenCalledWith(
        broadcast.id,
        tenantId,
        [BroadcastStatus.PAUSED],
        BroadcastStatus.SENDING,
        { previousStatus: null }
      );
      expect(result.status).toBe(BroadcastStatus.SENDING);
    });

    it('should default to SENDING if previousStatus is not SCHEDULED', async () => {
      const broadcast = createMockBroadcast({
        status: BroadcastStatus.PAUSED,
        previousStatus: null, // Edge case: previousStatus not set
      });

      const resumedBroadcast = createMockBroadcast({
        ...broadcast,
        status: BroadcastStatus.SENDING,
        previousStatus: null,
      });

      mockBroadcastRepository.findById.mockResolvedValue(broadcast);
      mockBroadcastRepository.updateStatusWithLock.mockResolvedValue(resumedBroadcast);

      const result = await broadcastService.resume(broadcast.id, tenantId, userId, true);

      expect(mockBroadcastRepository.updateStatusWithLock).toHaveBeenCalledWith(
        broadcast.id,
        tenantId,
        [BroadcastStatus.PAUSED],
        BroadcastStatus.SENDING,
        { previousStatus: null }
      );
      expect(result.status).toBe(BroadcastStatus.SENDING);
    });

    it('should throw ConflictException if broadcast is not PAUSED', async () => {
      const broadcast = createMockBroadcast({
        status: BroadcastStatus.SENDING,
      });

      mockBroadcastRepository.findById.mockResolvedValue(broadcast);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ConflictException } = require('../../../shared/exceptions/http-exceptions');
      mockBroadcastRepository.updateStatusWithLock.mockRejectedValue(
        new ConflictException(
          'Cannot transition broadcast from "sending" to "sending". Expected status: paused.'
        )
      );

      await expect(
        broadcastService.resume(broadcast.id, tenantId, userId, true)
      ).rejects.toThrow('Cannot transition broadcast');
    });
  });

  describe('cancel', () => {
    it('should cancel a SCHEDULED broadcast', async () => {
      const broadcast = createMockBroadcast({
        status: BroadcastStatus.SCHEDULED,
      });

      const cancelledBroadcast = createMockBroadcast({
        ...broadcast,
        status: BroadcastStatus.CANCELLED,
        previousStatus: null,
      });

      mockBroadcastRepository.findById.mockResolvedValue(broadcast);
      mockBroadcastRepository.updateStatusWithLock.mockResolvedValue(cancelledBroadcast);

      const result = await broadcastService.cancel(broadcast.id, tenantId, userId, true);

      expect(mockBroadcastRepository.updateStatusWithLock).toHaveBeenCalledWith(
        broadcast.id,
        tenantId,
        [BroadcastStatus.SCHEDULED, BroadcastStatus.PAUSED],
        BroadcastStatus.CANCELLED,
        { previousStatus: null }
      );
      expect(result.status).toBe(BroadcastStatus.CANCELLED);
    });

    it('should cancel a PAUSED broadcast', async () => {
      const broadcast = createMockBroadcast({
        status: BroadcastStatus.PAUSED,
      });

      const cancelledBroadcast = createMockBroadcast({
        ...broadcast,
        status: BroadcastStatus.CANCELLED,
        previousStatus: null,
      });

      mockBroadcastRepository.findById.mockResolvedValue(broadcast);
      mockBroadcastRepository.updateStatusWithLock.mockResolvedValue(cancelledBroadcast);

      const result = await broadcastService.cancel(broadcast.id, tenantId, userId, true);

      expect(result.status).toBe(BroadcastStatus.CANCELLED);
    });

    it('should throw ConflictException if broadcast cannot be cancelled', async () => {
      const broadcast = createMockBroadcast({
        status: BroadcastStatus.SENDING,
      });

      mockBroadcastRepository.findById.mockResolvedValue(broadcast);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ConflictException } = require('../../../shared/exceptions/http-exceptions');
      mockBroadcastRepository.updateStatusWithLock.mockRejectedValue(
        new ConflictException(
          'Cannot transition broadcast from "sending" to "cancelled".'
        )
      );

      await expect(
        broadcastService.cancel(broadcast.id, tenantId, userId, true)
      ).rejects.toThrow('Cannot transition broadcast');
    });

    it('should throw ConflictException for COMPLETED broadcast', async () => {
      const broadcast = createMockBroadcast({
        status: BroadcastStatus.COMPLETED,
      });

      mockBroadcastRepository.findById.mockResolvedValue(broadcast);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ConflictException: ConflictExc } = require('../../../shared/exceptions/http-exceptions');
      mockBroadcastRepository.updateStatusWithLock.mockRejectedValue(
        new ConflictExc(
          'Cannot transition broadcast from "completed" to "cancelled".'
        )
      );

      await expect(
        broadcastService.cancel(broadcast.id, tenantId, userId, true)
      ).rejects.toThrow('Cannot transition broadcast');
    });
  });

  describe('retry', () => {
    it('should retry a FAILED broadcast', async () => {
      const broadcast = createMockBroadcast({
        status: BroadcastStatus.FAILED,
        sentCount: 50,
        deliveredCount: 30,
        readCount: 10,
        failedCount: 20,
        completedAt: new Date(),
      });

      const retriedBroadcast = createMockBroadcast({
        ...broadcast,
        status: BroadcastStatus.SENDING,
        sentCount: 0,
        deliveredCount: 0,
        readCount: 0,
        failedCount: 0,
        startedAt: expect.any(Date),
        completedAt: null,
        previousStatus: null,
      });

      mockBroadcastRepository.findById.mockResolvedValue(broadcast);
      mockBroadcastRepository.updateStatusWithLock.mockResolvedValue(retriedBroadcast);

      const result = await broadcastService.retry(broadcast.id, tenantId, userId, true);

      expect(mockBroadcastRepository.updateStatusWithLock).toHaveBeenCalledWith(
        broadcast.id,
        tenantId,
        [BroadcastStatus.FAILED],
        BroadcastStatus.SENDING,
        expect.objectContaining({
          sentCount: 0,
          deliveredCount: 0,
          readCount: 0,
          failedCount: 0,
          startedAt: expect.any(Date),
          completedAt: null,
          previousStatus: null,
        })
      );
      expect(result.status).toBe(BroadcastStatus.SENDING);
    });

    it('should throw ConflictException if broadcast is not FAILED', async () => {
      const broadcast = createMockBroadcast({
        status: BroadcastStatus.COMPLETED,
      });

      mockBroadcastRepository.findById.mockResolvedValue(broadcast);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ConflictException } = require('../../../shared/exceptions/http-exceptions');
      mockBroadcastRepository.updateStatusWithLock.mockRejectedValue(
        new ConflictException(
          'Cannot transition broadcast from "completed" to "sending". Expected status: failed.'
        )
      );

      await expect(
        broadcastService.retry(broadcast.id, tenantId, userId, true)
      ).rejects.toThrow('Cannot transition broadcast');
    });

    it('should throw ConflictException for DRAFT broadcast', async () => {
      const broadcast = createMockBroadcast({
        status: BroadcastStatus.DRAFT,
      });

      mockBroadcastRepository.findById.mockResolvedValue(broadcast);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ConflictException: ConflictExc } = require('../../../shared/exceptions/http-exceptions');
      mockBroadcastRepository.updateStatusWithLock.mockRejectedValue(
        new ConflictExc(
          'Cannot transition broadcast from "draft" to "sending". Expected status: failed.'
        )
      );

      await expect(
        broadcastService.retry(broadcast.id, tenantId, userId, true)
      ).rejects.toThrow('Cannot transition broadcast');
    });
  });

  describe('bulkPause', () => {
    it('should pause multiple eligible broadcasts', async () => {
      mockBroadcastRepository.bulkPauseWithTransaction.mockResolvedValue({
        paused: 2,
        results: [
          { id: 'broadcast-1', previousStatus: BroadcastStatus.SCHEDULED },
          { id: 'broadcast-2', previousStatus: BroadcastStatus.SENDING },
        ],
      });

      const result = await broadcastService.bulkPause(
        ['broadcast-1', 'broadcast-2', 'broadcast-3'],
        tenantId,
        userId
      );

      expect(result.paused).toBe(2);
      expect(result.skipped).toBe(1);
      expect(mockBroadcastRepository.bulkPauseWithTransaction).toHaveBeenCalledWith(
        ['broadcast-1', 'broadcast-2', 'broadcast-3'],
        tenantId,
        [BroadcastStatus.SCHEDULED, BroadcastStatus.SENDING]
      );
    });

    it('should return zeros when no broadcasts can be paused', async () => {
      mockBroadcastRepository.bulkPauseWithTransaction.mockResolvedValue({
        paused: 0,
        results: [],
      });

      const result = await broadcastService.bulkPause(
        ['broadcast-1', 'broadcast-2'],
        tenantId,
        userId
      );

      expect(result.paused).toBe(0);
      expect(result.skipped).toBe(2);
    });

    it('should preserve previousStatus for each paused broadcast', async () => {
      mockBroadcastRepository.bulkPauseWithTransaction.mockResolvedValue({
        paused: 2,
        results: [
          { id: 'broadcast-1', previousStatus: BroadcastStatus.SCHEDULED },
          { id: 'broadcast-2', previousStatus: BroadcastStatus.SENDING },
        ],
      });

      await broadcastService.bulkPause(['broadcast-1', 'broadcast-2'], tenantId, userId);

      // Verify the repository was called with the correct statuses
      expect(mockBroadcastRepository.bulkPauseWithTransaction).toHaveBeenCalledWith(
        ['broadcast-1', 'broadcast-2'],
        tenantId,
        [BroadcastStatus.SCHEDULED, BroadcastStatus.SENDING]
      );
    });
  });

  describe('bulkCancel', () => {
    it('should cancel multiple eligible broadcasts', async () => {
      mockBroadcastRepository.bulkCancelWithTransaction.mockResolvedValue(2);

      const result = await broadcastService.bulkCancel(
        ['broadcast-1', 'broadcast-2', 'broadcast-3'],
        tenantId,
        userId
      );

      expect(result.cancelled).toBe(2);
      expect(result.skipped).toBe(1);
      expect(mockBroadcastRepository.bulkCancelWithTransaction).toHaveBeenCalledWith(
        ['broadcast-1', 'broadcast-2', 'broadcast-3'],
        tenantId,
        [BroadcastStatus.SCHEDULED, BroadcastStatus.PAUSED]
      );
    });

    it('should return zeros when no broadcasts can be cancelled', async () => {
      mockBroadcastRepository.bulkCancelWithTransaction.mockResolvedValue(0);

      const result = await broadcastService.bulkCancel(
        ['broadcast-1', 'broadcast-2'],
        tenantId,
        userId
      );

      expect(result.cancelled).toBe(0);
      expect(result.skipped).toBe(2);
    });
  });

  describe('getReport', () => {
    it('should return a formatted report for a broadcast', async () => {
      const broadcast = createMockBroadcast({
        status: BroadcastStatus.COMPLETED,
        sentCount: 100,
        deliveredCount: 95,
        readCount: 60,
        failedCount: 5,
        totalRecipients: 100,
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T11:00:00Z'),
      });

      mockBroadcastRepository.findById.mockResolvedValue(broadcast);

      const result = await broadcastService.getReport(broadcast.id, tenantId, userId, true);

      expect(mockBroadcastRepository.findById).toHaveBeenCalledWith(tenantId, broadcast.id);
      expect(result).toEqual(expect.objectContaining({
        id: broadcast.id,
        name: broadcast.name,
        status: BroadcastStatus.COMPLETED,
      }));
    });

    it('should throw NotFoundException if broadcast not found', async () => {
      mockBroadcastRepository.findById.mockResolvedValue(null);

      await expect(
        broadcastService.getReport('nonexistent', tenantId, userId, true)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Access Control', () => {
    it('should throw ForbiddenException when non-admin accesses other user broadcast', async () => {
      const broadcast = createMockBroadcast({
        createdBy: 'other-user',
      });

      mockBroadcastRepository.findById.mockResolvedValue(broadcast);

      await expect(
        broadcastService.schedule(broadcast.id, tenantId, userId, false)
      ).rejects.toThrow(ForbiddenException);

      await expect(
        broadcastService.schedule(broadcast.id, tenantId, userId, false)
      ).rejects.toThrow('You can only access your own broadcasts');
    });

    it('should allow non-admin to access their own broadcast', async () => {
      const broadcast = createMockBroadcast({
        status: BroadcastStatus.DRAFT,
        createdBy: userId,
        scheduledAt: new Date(Date.now() + 86400000),
      });

      const scheduledBroadcast = createMockBroadcast({
        ...broadcast,
        status: BroadcastStatus.SCHEDULED,
      });

      mockBroadcastRepository.findById.mockResolvedValue(broadcast);
      mockBroadcastRepository.updateStatusWithLock.mockResolvedValue(scheduledBroadcast);

      const result = await broadcastService.schedule(broadcast.id, tenantId, userId, false);

      expect(result.status).toBe(BroadcastStatus.SCHEDULED);
    });

    it('should allow admin to access any broadcast', async () => {
      const broadcast = createMockBroadcast({
        status: BroadcastStatus.DRAFT,
        createdBy: 'other-user',
        scheduledAt: new Date(Date.now() + 86400000),
      });

      const scheduledBroadcast = createMockBroadcast({
        ...broadcast,
        status: BroadcastStatus.SCHEDULED,
      });

      mockBroadcastRepository.findById.mockResolvedValue(broadcast);
      mockBroadcastRepository.updateStatusWithLock.mockResolvedValue(scheduledBroadcast);

      const result = await broadcastService.schedule(broadcast.id, tenantId, userId, true);

      expect(result.status).toBe(BroadcastStatus.SCHEDULED);
    });
  });
});
