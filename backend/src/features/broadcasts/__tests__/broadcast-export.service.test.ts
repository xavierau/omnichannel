import 'reflect-metadata';
import { BroadcastExportService } from '../broadcast-export.service';
import { BroadcastRepository, PaginatedResult } from '../broadcast.repository';
import { GroupRepository } from '../../groups/group.repository';
import { Broadcast, TemplateVariablesConfig } from '../broadcast.entity';
import { BroadcastStatus, RecipientType } from '../enums';
import { TemplateCategory } from '../../templates/enums';
import { CustomerGroup } from '../../groups/group.entity';

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

describe('BroadcastExportService', () => {
  let exportService: BroadcastExportService;
  let mockBroadcastRepository: jest.Mocked<BroadcastRepository>;
  let mockGroupRepository: jest.Mocked<GroupRepository>;

  const tenantId = 'tenant-123';
  const userId = 'user-123';

  const mockTemplateVariables: TemplateVariablesConfig = {
    header: undefined,
    bodyVariables: [{ index: 0, sourceType: 'static', staticValue: 'Hello' }],
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
    scheduledAt: new Date('2024-01-15T10:00:00Z'),
    isImmediate: false,
    timezone: 'UTC',
    status: BroadcastStatus.COMPLETED,
    sentCount: 95,
    deliveredCount: 90,
    readCount: 50,
    failedCount: 5,
    createdBy: userId,
    createdAt: new Date('2024-01-01T08:00:00Z'),
    updatedAt: new Date('2024-01-15T12:00:00Z'),
    startedAt: new Date('2024-01-15T10:00:00Z'),
    completedAt: new Date('2024-01-15T11:00:00Z'),
    previousStatus: null,
    customFields: {},
    channelAccountId: null,
    channelAccount: null,
    tenant: null as any,
    template: null,
    group: null,
    creator: null,
    ...overrides,
  });

  const createMockGroup = (overrides: Partial<CustomerGroup> = {}): CustomerGroup => ({
    id: 'group-1',
    tenantId,
    name: 'Test Group',
    description: 'Test group description',
    isStatic: true,
    memberIds: ['customer-1', 'customer-2'],
    criteria: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    tenant: null as any,
    ...overrides,
  });

  beforeEach(() => {
    mockBroadcastRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn(),
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
    } as unknown as jest.Mocked<BroadcastRepository>;

    mockGroupRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<GroupRepository>;

    exportService = new BroadcastExportService(
      mockBroadcastRepository,
      mockGroupRepository
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportToCsv', () => {
    it('should export broadcasts to CSV format', async () => {
      const broadcasts = [
        createMockBroadcast({ id: 'broadcast-1', name: 'Broadcast 1' }),
        createMockBroadcast({ id: 'broadcast-2', name: 'Broadcast 2' }),
      ];

      const paginatedResult: PaginatedResult<Broadcast> = {
        data: broadcasts,
        total: 2,
        page: 1,
        limit: 10000,
        totalPages: 1,
      };

      mockBroadcastRepository.findAll.mockResolvedValue(paginatedResult);
      mockGroupRepository.findById.mockResolvedValue(createMockGroup());

      const result = await exportService.exportToCsv(tenantId, {});

      expect(result).toContain('Name');
      expect(result).toContain('Description');
      expect(result).toContain('Template Name');
      expect(result).toContain('Broadcast 1');
      expect(result).toContain('Broadcast 2');
    });

    it('should include all required columns in CSV export', async () => {
      const broadcast = createMockBroadcast();
      const paginatedResult: PaginatedResult<Broadcast> = {
        data: [broadcast],
        total: 1,
        page: 1,
        limit: 10000,
        totalPages: 1,
      };

      mockBroadcastRepository.findAll.mockResolvedValue(paginatedResult);
      mockGroupRepository.findById.mockResolvedValue(createMockGroup());

      const result = await exportService.exportToCsv(tenantId, {});

      // Check header row contains all expected columns
      expect(result).toContain('Name');
      expect(result).toContain('Description');
      expect(result).toContain('Template Name');
      expect(result).toContain('Category');
      expect(result).toContain('Recipient Type');
      expect(result).toContain('Group Name');
      expect(result).toContain('Total Recipients');
      expect(result).toContain('Status');
      expect(result).toContain('Scheduled At');
      expect(result).toContain('Sent Count');
      expect(result).toContain('Delivered Count');
      expect(result).toContain('Read Count');
      expect(result).toContain('Failed Count');
      expect(result).toContain('Created At');
      expect(result).toContain('Updated At');
      expect(result).toContain('Completed At');
    });

    it('should limit export to 10000 records', async () => {
      const broadcasts = [createMockBroadcast()];
      const paginatedResult: PaginatedResult<Broadcast> = {
        data: broadcasts,
        total: 1,
        page: 1,
        limit: 10000,
        totalPages: 1,
      };

      mockBroadcastRepository.findAll.mockResolvedValue(paginatedResult);
      mockGroupRepository.findById.mockResolvedValue(createMockGroup());

      await exportService.exportToCsv(tenantId, { limit: 50000 });

      expect(mockBroadcastRepository.findAll).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ limit: 10000 })
      );
    });

    it('should handle broadcasts with no group (individual customers)', async () => {
      const broadcast = createMockBroadcast({
        recipientType: RecipientType.CUSTOMERS,
        groupId: null,
        customerIds: ['customer-1', 'customer-2'],
      });

      const paginatedResult: PaginatedResult<Broadcast> = {
        data: [broadcast],
        total: 1,
        page: 1,
        limit: 10000,
        totalPages: 1,
      };

      mockBroadcastRepository.findAll.mockResolvedValue(paginatedResult);

      const result = await exportService.exportToCsv(tenantId, {});

      // Should not call groupRepository for non-group recipients
      expect(mockGroupRepository.findById).not.toHaveBeenCalled();
    });

    it('should escape CSV fields to prevent injection', async () => {
      const broadcast = createMockBroadcast({
        name: '=SUM(A1:A10)',
        description: '+CMD|something',
      });

      const paginatedResult: PaginatedResult<Broadcast> = {
        data: [broadcast],
        total: 1,
        page: 1,
        limit: 10000,
        totalPages: 1,
      };

      mockBroadcastRepository.findAll.mockResolvedValue(paginatedResult);
      mockGroupRepository.findById.mockResolvedValue(createMockGroup());

      const result = await exportService.exportToCsv(tenantId, {});

      // Dangerous characters should be escaped with a leading apostrophe
      expect(result).toContain("'=SUM(A1:A10)");
      expect(result).toContain("'+CMD|something");
    });

    it('should format dates in ISO format', async () => {
      const broadcast = createMockBroadcast({
        scheduledAt: new Date('2024-01-15T10:30:00.000Z'),
        createdAt: new Date('2024-01-01T08:00:00.000Z'),
      });

      const paginatedResult: PaginatedResult<Broadcast> = {
        data: [broadcast],
        total: 1,
        page: 1,
        limit: 10000,
        totalPages: 1,
      };

      mockBroadcastRepository.findAll.mockResolvedValue(paginatedResult);
      mockGroupRepository.findById.mockResolvedValue(createMockGroup());

      const result = await exportService.exportToCsv(tenantId, {});

      expect(result).toContain('2024-01-15T10:30:00.000Z');
      expect(result).toContain('2024-01-01T08:00:00.000Z');
    });

    it('should handle null values gracefully', async () => {
      const broadcast = createMockBroadcast({
        description: null,
        scheduledAt: null,
        completedAt: null,
        groupId: null,
        recipientType: RecipientType.CUSTOMERS,
      });

      const paginatedResult: PaginatedResult<Broadcast> = {
        data: [broadcast],
        total: 1,
        page: 1,
        limit: 10000,
        totalPages: 1,
      };

      mockBroadcastRepository.findAll.mockResolvedValue(paginatedResult);

      // Should not throw
      const result = await exportService.exportToCsv(tenantId, {});
      expect(result).toBeDefined();
    });

    it('should return empty CSV with headers when no data', async () => {
      const paginatedResult: PaginatedResult<Broadcast> = {
        data: [],
        total: 0,
        page: 1,
        limit: 10000,
        totalPages: 0,
      };

      mockBroadcastRepository.findAll.mockResolvedValue(paginatedResult);

      const result = await exportService.exportToCsv(tenantId, {});

      expect(result).toContain('Name');
      expect(result).toContain('Description');
    });
  });

  describe('exportToExcel', () => {
    it('should export broadcasts to Excel buffer', async () => {
      const broadcasts = [
        createMockBroadcast({ id: 'broadcast-1', name: 'Broadcast 1' }),
        createMockBroadcast({ id: 'broadcast-2', name: 'Broadcast 2' }),
      ];

      const paginatedResult: PaginatedResult<Broadcast> = {
        data: broadcasts,
        total: 2,
        page: 1,
        limit: 10000,
        totalPages: 1,
      };

      mockBroadcastRepository.findAll.mockResolvedValue(paginatedResult);
      mockGroupRepository.findById.mockResolvedValue(createMockGroup());

      const result = await exportService.exportToExcel(tenantId, {});

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should limit export to 10000 records', async () => {
      const broadcasts = [createMockBroadcast()];
      const paginatedResult: PaginatedResult<Broadcast> = {
        data: broadcasts,
        total: 1,
        page: 1,
        limit: 10000,
        totalPages: 1,
      };

      mockBroadcastRepository.findAll.mockResolvedValue(paginatedResult);
      mockGroupRepository.findById.mockResolvedValue(createMockGroup());

      await exportService.exportToExcel(tenantId, { limit: 50000 });

      expect(mockBroadcastRepository.findAll).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ limit: 10000 })
      );
    });

    it('should handle null values in Excel export', async () => {
      const broadcast = createMockBroadcast({
        description: null,
        scheduledAt: null,
        completedAt: null,
        groupId: null,
        recipientType: RecipientType.CUSTOMERS,
      });

      const paginatedResult: PaginatedResult<Broadcast> = {
        data: [broadcast],
        total: 1,
        page: 1,
        limit: 10000,
        totalPages: 1,
      };

      mockBroadcastRepository.findAll.mockResolvedValue(paginatedResult);

      // Should not throw
      const result = await exportService.exportToExcel(tenantId, {});
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should include group name for group recipient type', async () => {
      const broadcast = createMockBroadcast({
        recipientType: RecipientType.GROUP,
        groupId: 'group-1',
      });

      const paginatedResult: PaginatedResult<Broadcast> = {
        data: [broadcast],
        total: 1,
        page: 1,
        limit: 10000,
        totalPages: 1,
      };

      mockBroadcastRepository.findAll.mockResolvedValue(paginatedResult);
      mockGroupRepository.findById.mockResolvedValue(createMockGroup({ name: 'VIP Customers' }));

      await exportService.exportToExcel(tenantId, {});

      expect(mockGroupRepository.findById).toHaveBeenCalledWith(tenantId, 'group-1');
    });

    it('should pass through query options to repository', async () => {
      const paginatedResult: PaginatedResult<Broadcast> = {
        data: [],
        total: 0,
        page: 1,
        limit: 10000,
        totalPages: 0,
      };

      mockBroadcastRepository.findAll.mockResolvedValue(paginatedResult);

      await exportService.exportToExcel(tenantId, {
        search: 'test',
        statuses: [BroadcastStatus.COMPLETED],
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(mockBroadcastRepository.findAll).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          search: 'test',
          statuses: [BroadcastStatus.COMPLETED],
          sortBy: 'name',
          sortOrder: 'asc',
          limit: 10000,
          page: 1,
        })
      );
    });
  });

  describe('getExportData', () => {
    it('should fetch and transform data for export', async () => {
      const broadcast = createMockBroadcast({
        recipientType: RecipientType.GROUP,
        groupId: 'group-1',
      });

      const paginatedResult: PaginatedResult<Broadcast> = {
        data: [broadcast],
        total: 1,
        page: 1,
        limit: 10000,
        totalPages: 1,
      };

      mockBroadcastRepository.findAll.mockResolvedValue(paginatedResult);
      mockGroupRepository.findById.mockResolvedValue(createMockGroup({ name: 'Test Group' }));

      const result = await exportService.getExportData(tenantId, {});

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: broadcast.name,
        description: broadcast.description,
        templateName: broadcast.templateName,
        category: broadcast.templateCategory,
        recipientType: broadcast.recipientType,
        groupName: 'Test Group',
        totalRecipients: broadcast.totalRecipients,
        status: broadcast.status,
        sentCount: broadcast.sentCount,
        deliveredCount: broadcast.deliveredCount,
        readCount: broadcast.readCount,
        failedCount: broadcast.failedCount,
      });
    });

    it('should cache group lookups to avoid N+1 queries', async () => {
      const broadcasts = [
        createMockBroadcast({ id: 'b1', groupId: 'group-1' }),
        createMockBroadcast({ id: 'b2', groupId: 'group-1' }),
        createMockBroadcast({ id: 'b3', groupId: 'group-2' }),
      ];

      const paginatedResult: PaginatedResult<Broadcast> = {
        data: broadcasts,
        total: 3,
        page: 1,
        limit: 10000,
        totalPages: 1,
      };

      mockBroadcastRepository.findAll.mockResolvedValue(paginatedResult);
      mockGroupRepository.findById
        .mockResolvedValueOnce(createMockGroup({ id: 'group-1', name: 'Group 1' }))
        .mockResolvedValueOnce(createMockGroup({ id: 'group-2', name: 'Group 2' }));

      await exportService.getExportData(tenantId, {});

      // Should only call findById twice (once for each unique group)
      expect(mockGroupRepository.findById).toHaveBeenCalledTimes(2);
    });
  });
});
