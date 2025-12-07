import 'reflect-metadata';
import { ConversationService } from '../conversation.service';
import { ConversationRepository } from '../../repositories/conversation.repository';
import { ConversationAssignmentRepository } from '../../repositories/conversation-assignment.repository';
import { TeamService } from '../../../teams/services/team.service';
import { Conversation } from '../../entities/conversation.entity';
import { ConversationStatus, AssignmentAction } from '../../enums';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '../../../../shared/exceptions/http-exceptions';

// Mock the logger to avoid console output during tests
jest.mock('../../../../config/logger.config', () => ({
  auditLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('ConversationService', () => {
  let service: ConversationService;
  let conversationRepository: jest.Mocked<ConversationRepository>;
  let assignmentRepository: jest.Mocked<ConversationAssignmentRepository>;
  let teamService: jest.Mocked<TeamService>;

  const tenantId = 'tenant-123';
  const userId = 'user-456';
  const conversationId = 'conv-789';
  const channelAccountId = 'channel-111';

  const createMockConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
    id: conversationId,
    tenantId,
    channelAccountId,
    customerId: 'customer-222',
    status: ConversationStatus.UNASSIGNED,
    assignedToId: null,
    unreadCount: 0,
    lastMessageAt: null,
    lastMessagePreview: null,
    lastMessageDirection: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Conversation);

  beforeEach(() => {
    // Create mocked repositories
    conversationRepository = {
      findById: jest.fn(),
      findAllForOperator: jest.fn(),
      update: jest.fn(),
      resetUnreadCount: jest.fn(),
      updateStatus: jest.fn(),
      assignAtomic: jest.fn(),
    } as unknown as jest.Mocked<ConversationRepository>;

    assignmentRepository = {
      create: jest.fn(),
    } as unknown as jest.Mocked<ConversationAssignmentRepository>;

    teamService = {
      getAccessibleChannelAccountIds: jest.fn(),
      hasAccessToChannelAccount: jest.fn(),
    } as unknown as jest.Mocked<TeamService>;

    service = new ConversationService(
      conversationRepository,
      assignmentRepository,
      teamService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listConversations', () => {
    it('should return paginated conversations for operator', async () => {
      const mockConversations = [createMockConversation()];
      const paginatedResult = {
        data: mockConversations,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      teamService.getAccessibleChannelAccountIds.mockResolvedValue([channelAccountId]);
      conversationRepository.findAllForOperator.mockResolvedValue(paginatedResult);

      const result = await service.listConversations(tenantId, userId, {});

      expect(teamService.getAccessibleChannelAccountIds).toHaveBeenCalledWith(userId);
      expect(conversationRepository.findAllForOperator).toHaveBeenCalledWith(
        tenantId,
        userId,
        [channelAccountId],
        {}
      );
      expect(result).toEqual(paginatedResult);
    });

    it('should return empty result when user has no accessible channel accounts', async () => {
      teamService.getAccessibleChannelAccountIds.mockResolvedValue([]);
      conversationRepository.findAllForOperator.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      const result = await service.listConversations(tenantId, userId, {});

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getConversation', () => {
    it('should return conversation when user has channel access', async () => {
      const mockConversation = createMockConversation();
      conversationRepository.findById.mockResolvedValue(mockConversation);
      teamService.getAccessibleChannelAccountIds.mockResolvedValue([channelAccountId]);

      const result = await service.getConversation(tenantId, userId, conversationId);

      expect(result).toEqual(mockConversation);
    });

    it('should return conversation when user is assigned to it', async () => {
      const mockConversation = createMockConversation({
        assignedToId: userId,
        channelAccountId: 'other-channel',
      });
      conversationRepository.findById.mockResolvedValue(mockConversation);
      teamService.getAccessibleChannelAccountIds.mockResolvedValue([channelAccountId]);

      const result = await service.getConversation(tenantId, userId, conversationId);

      expect(result).toEqual(mockConversation);
    });

    it('should throw NotFoundException when conversation not found', async () => {
      conversationRepository.findById.mockResolvedValue(null);

      await expect(
        service.getConversation(tenantId, userId, conversationId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user has no access', async () => {
      const mockConversation = createMockConversation({
        channelAccountId: 'other-channel',
        assignedToId: 'other-user',
      });
      conversationRepository.findById.mockResolvedValue(mockConversation);
      teamService.getAccessibleChannelAccountIds.mockResolvedValue([channelAccountId]);

      await expect(
        service.getConversation(tenantId, userId, conversationId)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('pickupConversation', () => {
    it('should assign unassigned conversation to user', async () => {
      const mockConversation = createMockConversation({
        status: ConversationStatus.UNASSIGNED,
        assignedToId: null,
      });
      const updatedConversation = createMockConversation({
        status: ConversationStatus.ACTIVE,
        assignedToId: userId,
      });

      conversationRepository.findById.mockResolvedValue(mockConversation);
      teamService.getAccessibleChannelAccountIds.mockResolvedValue([channelAccountId]);
      conversationRepository.assignAtomic.mockResolvedValue({
        wasUpdated: true,
        previousAssignedToId: null,
      });
      conversationRepository.findById.mockResolvedValueOnce(mockConversation);
      conversationRepository.findById.mockResolvedValueOnce(updatedConversation);
      assignmentRepository.create.mockResolvedValue({} as any);

      const result = await service.pickupConversation(tenantId, conversationId, userId);

      expect(conversationRepository.assignAtomic).toHaveBeenCalledWith(
        tenantId,
        conversationId,
        userId
      );
      expect(assignmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          conversationId,
          fromUserId: null,
          toUserId: userId,
          action: AssignmentAction.ASSIGNED,
          performedById: userId,
        })
      );
    });

    it('should return conversation if already assigned to user', async () => {
      const mockConversation = createMockConversation({
        status: ConversationStatus.ACTIVE,
        assignedToId: userId,
      });

      conversationRepository.findById.mockResolvedValue(mockConversation);
      teamService.getAccessibleChannelAccountIds.mockResolvedValue([channelAccountId]);

      const result = await service.pickupConversation(tenantId, conversationId, userId);

      expect(result).toEqual(mockConversation);
      expect(conversationRepository.assignAtomic).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when conversation is assigned to another user', async () => {
      const mockConversation = createMockConversation({
        status: ConversationStatus.ACTIVE,
        assignedToId: 'other-user',
      });

      conversationRepository.findById.mockResolvedValue(mockConversation);
      teamService.getAccessibleChannelAccountIds.mockResolvedValue([channelAccountId]);

      await expect(
        service.pickupConversation(tenantId, conversationId, userId)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('releaseConversation', () => {
    it('should release conversation assigned to user', async () => {
      const mockConversation = createMockConversation({
        status: ConversationStatus.ACTIVE,
        assignedToId: userId,
      });
      const releasedConversation = createMockConversation({
        status: ConversationStatus.UNASSIGNED,
        assignedToId: null,
      });

      conversationRepository.findById.mockResolvedValueOnce(mockConversation);
      teamService.getAccessibleChannelAccountIds.mockResolvedValue([channelAccountId]);
      conversationRepository.assignAtomic.mockResolvedValue({
        wasUpdated: true,
        previousAssignedToId: userId,
      });
      conversationRepository.findById.mockResolvedValueOnce(releasedConversation);
      assignmentRepository.create.mockResolvedValue({} as any);

      const result = await service.releaseConversation(tenantId, conversationId, userId);

      expect(conversationRepository.assignAtomic).toHaveBeenCalledWith(
        tenantId,
        conversationId,
        null
      );
      expect(assignmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          conversationId,
          fromUserId: userId,
          toUserId: null,
          action: AssignmentAction.RELEASED,
          performedById: userId,
        })
      );
    });

    it('should throw BadRequestException when conversation is not assigned to user', async () => {
      const mockConversation = createMockConversation({
        status: ConversationStatus.ACTIVE,
        assignedToId: 'other-user',
      });

      conversationRepository.findById.mockResolvedValue(mockConversation);
      teamService.getAccessibleChannelAccountIds.mockResolvedValue([channelAccountId]);

      await expect(
        service.releaseConversation(tenantId, conversationId, userId)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('assignConversation', () => {
    const targetUserId = 'target-user-999';

    it('should transfer conversation to target user', async () => {
      const mockConversation = createMockConversation({
        status: ConversationStatus.ACTIVE,
        assignedToId: userId,
      });
      const transferredConversation = createMockConversation({
        status: ConversationStatus.ACTIVE,
        assignedToId: targetUserId,
      });

      conversationRepository.findById.mockResolvedValueOnce(mockConversation);
      teamService.getAccessibleChannelAccountIds.mockResolvedValue([channelAccountId]);
      teamService.hasAccessToChannelAccount.mockResolvedValue(true);
      conversationRepository.assignAtomic.mockResolvedValue({
        wasUpdated: true,
        previousAssignedToId: userId,
      });
      conversationRepository.findById.mockResolvedValueOnce(transferredConversation);
      assignmentRepository.create.mockResolvedValue({} as any);

      const result = await service.assignConversation(
        tenantId,
        conversationId,
        targetUserId,
        userId
      );

      expect(teamService.hasAccessToChannelAccount).toHaveBeenCalledWith(
        targetUserId,
        channelAccountId
      );
      expect(assignmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AssignmentAction.TRANSFERRED,
          performedById: userId,
        })
      );
    });

    it('should throw ForbiddenException when target user has no channel access', async () => {
      const mockConversation = createMockConversation({
        status: ConversationStatus.ACTIVE,
        assignedToId: userId,
      });

      conversationRepository.findById.mockResolvedValue(mockConversation);
      teamService.getAccessibleChannelAccountIds.mockResolvedValue([channelAccountId]);
      teamService.hasAccessToChannelAccount.mockResolvedValue(false);

      await expect(
        service.assignConversation(tenantId, conversationId, targetUserId, userId)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateStatus', () => {
    it('should update status with valid transition', async () => {
      const mockConversation = createMockConversation({
        status: ConversationStatus.ACTIVE,
      });
      const updatedConversation = createMockConversation({
        status: ConversationStatus.RESOLVED,
      });

      conversationRepository.findById.mockResolvedValueOnce(mockConversation);
      teamService.getAccessibleChannelAccountIds.mockResolvedValue([channelAccountId]);
      conversationRepository.updateStatus.mockResolvedValue(true);
      conversationRepository.findById.mockResolvedValueOnce(updatedConversation);

      const result = await service.updateStatus(
        tenantId,
        conversationId,
        userId,
        ConversationStatus.RESOLVED
      );

      expect(result.status).toBe(ConversationStatus.RESOLVED);
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      const mockConversation = createMockConversation({
        status: ConversationStatus.CLOSED,
      });

      conversationRepository.findById.mockResolvedValue(mockConversation);
      teamService.getAccessibleChannelAccountIds.mockResolvedValue([channelAccountId]);

      await expect(
        service.updateStatus(tenantId, conversationId, userId, ConversationStatus.RESOLVED)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('markAsRead', () => {
    it('should reset unread count', async () => {
      const mockConversation = createMockConversation({
        unreadCount: 5,
      });
      const updatedConversation = createMockConversation({
        unreadCount: 0,
      });

      conversationRepository.findById.mockResolvedValueOnce(mockConversation);
      teamService.getAccessibleChannelAccountIds.mockResolvedValue([channelAccountId]);
      conversationRepository.resetUnreadCount.mockResolvedValue();
      conversationRepository.findById.mockResolvedValueOnce(updatedConversation);

      const result = await service.markAsRead(tenantId, conversationId, userId);

      expect(conversationRepository.resetUnreadCount).toHaveBeenCalledWith(
        tenantId,
        conversationId
      );
      expect(result.unreadCount).toBe(0);
    });
  });

  describe('validateAccess', () => {
    it('should return conversation when user has channel access', async () => {
      const mockConversation = createMockConversation();
      conversationRepository.findById.mockResolvedValue(mockConversation);
      teamService.getAccessibleChannelAccountIds.mockResolvedValue([channelAccountId]);

      const result = await service.validateAccess(tenantId, userId, conversationId);

      expect(result).toEqual(mockConversation);
    });

    it('should return conversation when user is assigned', async () => {
      const mockConversation = createMockConversation({
        channelAccountId: 'other-channel',
        assignedToId: userId,
      });
      conversationRepository.findById.mockResolvedValue(mockConversation);
      teamService.getAccessibleChannelAccountIds.mockResolvedValue([channelAccountId]);

      const result = await service.validateAccess(tenantId, userId, conversationId);

      expect(result).toEqual(mockConversation);
    });

    it('should throw ForbiddenException when no access', async () => {
      const mockConversation = createMockConversation({
        channelAccountId: 'other-channel',
        assignedToId: 'other-user',
      });
      conversationRepository.findById.mockResolvedValue(mockConversation);
      teamService.getAccessibleChannelAccountIds.mockResolvedValue([channelAccountId]);

      await expect(
        service.validateAccess(tenantId, userId, conversationId)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('status transition validation', () => {
    const validTransitions: Array<{
      from: ConversationStatus;
      to: ConversationStatus;
      valid: boolean;
    }> = [
      // From UNASSIGNED
      { from: ConversationStatus.UNASSIGNED, to: ConversationStatus.ACTIVE, valid: true },
      { from: ConversationStatus.UNASSIGNED, to: ConversationStatus.WAITING, valid: true },
      { from: ConversationStatus.UNASSIGNED, to: ConversationStatus.RESOLVED, valid: true },
      { from: ConversationStatus.UNASSIGNED, to: ConversationStatus.CLOSED, valid: true },
      // From ACTIVE
      { from: ConversationStatus.ACTIVE, to: ConversationStatus.WAITING, valid: true },
      { from: ConversationStatus.ACTIVE, to: ConversationStatus.RESOLVED, valid: true },
      { from: ConversationStatus.ACTIVE, to: ConversationStatus.CLOSED, valid: true },
      { from: ConversationStatus.ACTIVE, to: ConversationStatus.UNASSIGNED, valid: true },
      // From WAITING
      { from: ConversationStatus.WAITING, to: ConversationStatus.ACTIVE, valid: true },
      { from: ConversationStatus.WAITING, to: ConversationStatus.RESOLVED, valid: true },
      { from: ConversationStatus.WAITING, to: ConversationStatus.CLOSED, valid: true },
      { from: ConversationStatus.WAITING, to: ConversationStatus.UNASSIGNED, valid: false },
      // From RESOLVED
      { from: ConversationStatus.RESOLVED, to: ConversationStatus.ACTIVE, valid: true },
      { from: ConversationStatus.RESOLVED, to: ConversationStatus.CLOSED, valid: true },
      { from: ConversationStatus.RESOLVED, to: ConversationStatus.WAITING, valid: false },
      { from: ConversationStatus.RESOLVED, to: ConversationStatus.UNASSIGNED, valid: false },
      // From CLOSED
      { from: ConversationStatus.CLOSED, to: ConversationStatus.ACTIVE, valid: true },
      { from: ConversationStatus.CLOSED, to: ConversationStatus.WAITING, valid: false },
      { from: ConversationStatus.CLOSED, to: ConversationStatus.RESOLVED, valid: false },
      { from: ConversationStatus.CLOSED, to: ConversationStatus.UNASSIGNED, valid: false },
    ];

    validTransitions.forEach(({ from, to, valid }) => {
      it(`should ${valid ? 'allow' : 'reject'} transition from ${from} to ${to}`, async () => {
        const mockConversation = createMockConversation({ status: from });

        conversationRepository.findById.mockResolvedValue(mockConversation);
        teamService.getAccessibleChannelAccountIds.mockResolvedValue([channelAccountId]);

        if (valid) {
          conversationRepository.updateStatus.mockResolvedValue(true);
          conversationRepository.findById.mockResolvedValueOnce(mockConversation);
          conversationRepository.findById.mockResolvedValueOnce(
            createMockConversation({ status: to })
          );

          const result = await service.updateStatus(tenantId, conversationId, userId, to);
          expect(result.status).toBe(to);
        } else {
          await expect(
            service.updateStatus(tenantId, conversationId, userId, to)
          ).rejects.toThrow(BadRequestException);
        }
      });
    });
  });
});
