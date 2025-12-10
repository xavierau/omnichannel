import 'reflect-metadata';
import { AgentApiController } from '../controllers/agent-api.controller';
import { ConversationService } from '@features/inbox/services/conversation.service';
import { ConversationRepository } from '@features/inbox/repositories/conversation.repository';
import { ConversationMessageRepository } from '@features/inbox/repositories/conversation-message.repository';
import { UserRepository } from '@features/users/user.repository';
import { InboxMessageQueue } from '../../../jobs/inbox-message.queue';
import { Conversation } from '@features/inbox/entities/conversation.entity';
import { ConversationMessage } from '@features/inbox/entities/conversation-message.entity';
import { ApiKey } from '@features/api-keys/entities/api-key.entity';
import { User } from '@features/users/user.entity';
import { Customer } from '@features/customers/customer.entity';
import { ConversationStatus, MessageContentType, MessageDirection, MessageDeliveryStatus } from '@features/inbox/enums';
import { ApiKeyPermission } from '@features/api-keys/enums/api-key-permission.enum';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@shared/exceptions/http-exceptions';
import { Request, Response, NextFunction } from 'express';

// Mock the logger
jest.mock('../../../config/logger.config', () => ({
  auditLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AgentApiController', () => {
  let controller: AgentApiController;
  let conversationService: jest.Mocked<ConversationService>;
  let conversationRepository: jest.Mocked<ConversationRepository>;
  let messageRepository: jest.Mocked<ConversationMessageRepository>;
  let userRepository: jest.Mocked<UserRepository>;
  let inboxMessageQueue: jest.Mocked<InboxMessageQueue>;

  const tenantId = 'tenant-123';
  const apiKeyId = 'apikey-456';
  const conversationId = 'conv-789';
  const channelAccountId = 'channel-111';
  const customerId = 'customer-222';
  const operatorId = 'operator-333';

  const createMockApiKey = (overrides: Partial<ApiKey> = {}): ApiKey => ({
    id: apiKeyId,
    tenantId,
    channelAccountId: null, // Not scoped by default
    name: 'Test API Key',
    keyHash: 'hash',
    keyPrefix: 'test1234',
    permissions: [
      ApiKeyPermission.CONVERSATION_READ,
      ApiKeyPermission.CONVERSATION_UPDATE_STATUS,
      ApiKeyPermission.CONVERSATION_ASSIGN,
      ApiKeyPermission.MESSAGE_SEND,
    ],
    expiresAt: null,
    lastUsedAt: null,
    isActive: true,
    createdById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    isValid: jest.fn().mockReturnValue(true),
    isExpired: jest.fn().mockReturnValue(false),
    hasPermission: jest.fn().mockReturnValue(true),
    hasAllPermissions: jest.fn().mockReturnValue(true),
    hasAnyPermission: jest.fn().mockReturnValue(true),
    ...overrides,
  } as unknown as ApiKey);

  const createMockCustomer = (): Customer => ({
    id: customerId,
    tenantId,
    name: 'Test Customer',
    whatsappNumber: '+1234567890',
  } as unknown as Customer);

  const createMockConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
    id: conversationId,
    tenantId,
    channelAccountId,
    customerId,
    customer: createMockCustomer(),
    status: ConversationStatus.ACTIVE,
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

  const createMockMessage = (): Partial<ConversationMessage> => ({
    id: 'msg-123',
    tenantId,
    conversationId,
    direction: MessageDirection.OUTBOUND,
    contentType: MessageContentType.TEXT,
    content: { body: 'Test message' },
    deliveryStatus: MessageDeliveryStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const createMockRequest = (
    params: Record<string, string> = {},
    body: Record<string, unknown> = {},
    apiKey: ApiKey = createMockApiKey()
  ): Request => ({
    params,
    body,
    tenantId,
    apiKey,
  } as unknown as Request);

  const createMockResponse = (): Response => {
    const res = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    } as unknown as Response;
    return res;
  };

  const createMockNext = (): NextFunction => jest.fn();

  /**
   * Helper to invoke controller methods that are wrapped by asyncHandler.
   * The asyncHandler catches errors and passes them to next(), so we need
   * to capture what was passed to next() to verify errors.
   *
   * Since asyncHandler returns a sync function that starts an async operation,
   * we need to wait for all promises to settle before checking results.
   */
  const invokeHandler = async (
    handler: (req: Request, res: Response, next: NextFunction) => void,
    req: Request,
    res: Response
  ): Promise<Error | undefined> => {
    return new Promise<Error | undefined>((resolve) => {
      const next = (err?: unknown) => {
        if (err instanceof Error) {
          resolve(err);
        } else {
          resolve(undefined);
        }
      };

      // Execute the handler
      handler(req, res, next as NextFunction);

      // Allow enough time for async operations to complete
      // We need to flush the microtask queue multiple times
      // to ensure all chained promises resolve
      process.nextTick(() => {
        process.nextTick(() => {
          process.nextTick(() => {
            resolve(undefined);
          });
        });
      });
    });
  };

  beforeEach(() => {
    conversationService = {
      updateStatus: jest.fn(),
      getConversation: jest.fn(),
    } as unknown as jest.Mocked<ConversationService>;

    conversationRepository = {
      findById: jest.fn(),
      assignAtomic: jest.fn(),
    } as unknown as jest.Mocked<ConversationRepository>;

    messageRepository = {
      create: jest.fn(),
    } as unknown as jest.Mocked<ConversationMessageRepository>;

    userRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    inboxMessageQueue = {
      queueOutboundMessage: jest.fn(),
    } as unknown as jest.Mocked<InboxMessageQueue>;

    controller = new AgentApiController(
      conversationService,
      conversationRepository,
      messageRepository,
      userRepository,
      inboxMessageQueue
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getConversation', () => {
    it('should return conversation when found and accessible', async () => {
      const mockConversation = createMockConversation();
      conversationRepository.findById.mockResolvedValue(mockConversation);

      const req = createMockRequest({ id: conversationId });
      const res = createMockResponse();

      const error = await invokeHandler(controller.getConversation, req, res);

      expect(error).toBeUndefined();
      expect(conversationRepository.findById).toHaveBeenCalledWith(tenantId, conversationId);
      expect(res.json).toHaveBeenCalledWith({ data: mockConversation });
    });

    it('should throw NotFoundException when conversation not found', async () => {
      conversationRepository.findById.mockResolvedValue(null);

      const req = createMockRequest({ id: conversationId });
      const res = createMockResponse();

      const error = await invokeHandler(controller.getConversation, req, res);

      expect(error).toBeInstanceOf(NotFoundException);
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when API key is scoped to different channel', async () => {
      const mockConversation = createMockConversation();
      const scopedApiKey = createMockApiKey({ channelAccountId: 'other-channel' });
      conversationRepository.findById.mockResolvedValue(mockConversation);

      const req = createMockRequest({ id: conversationId }, {}, scopedApiKey);
      const res = createMockResponse();

      const error = await invokeHandler(controller.getConversation, req, res);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should allow access when API key is scoped to matching channel', async () => {
      const mockConversation = createMockConversation();
      const scopedApiKey = createMockApiKey({ channelAccountId });
      conversationRepository.findById.mockResolvedValue(mockConversation);

      const req = createMockRequest({ id: conversationId }, {}, scopedApiKey);
      const res = createMockResponse();

      const error = await invokeHandler(controller.getConversation, req, res);

      expect(error).toBeUndefined();
      expect(res.json).toHaveBeenCalledWith({ data: mockConversation });
    });
  });

  describe('updateStatus', () => {
    it('should update conversation status', async () => {
      const mockConversation = createMockConversation({ status: ConversationStatus.ACTIVE });
      const updatedConversation = createMockConversation({ status: ConversationStatus.RESOLVED });

      conversationRepository.findById.mockResolvedValue(mockConversation);
      conversationService.updateStatus.mockResolvedValue(updatedConversation);

      const req = createMockRequest(
        { id: conversationId },
        { status: ConversationStatus.RESOLVED }
      );
      const res = createMockResponse();

      const error = await invokeHandler(controller.updateStatus, req, res);

      expect(error).toBeUndefined();
      expect(conversationService.updateStatus).toHaveBeenCalledWith(
        tenantId,
        conversationId,
        apiKeyId,
        ConversationStatus.RESOLVED
      );
      expect(res.json).toHaveBeenCalledWith({ data: updatedConversation });
    });

    it('should throw NotFoundException when conversation not found', async () => {
      conversationRepository.findById.mockResolvedValue(null);

      const req = createMockRequest(
        { id: conversationId },
        { status: ConversationStatus.RESOLVED }
      );
      const res = createMockResponse();

      const error = await invokeHandler(controller.updateStatus, req, res);

      expect(error).toBeInstanceOf(NotFoundException);
    });
  });

  describe('assignConversation', () => {
    it('should assign conversation to operator', async () => {
      const mockConversation = createMockConversation();
      const mockOperator = { id: operatorId, tenantId } as User;
      const updatedConversation = createMockConversation({ assignedToId: operatorId });

      conversationRepository.findById
        .mockResolvedValueOnce(mockConversation)
        .mockResolvedValueOnce(updatedConversation);
      userRepository.findById.mockResolvedValue(mockOperator);
      conversationRepository.assignAtomic.mockResolvedValue({
        wasUpdated: true,
        previousAssignedToId: null,
      });

      const req = createMockRequest(
        { id: conversationId },
        { operatorId }
      );
      const res = createMockResponse();

      const error = await invokeHandler(controller.assignConversation, req, res);

      expect(error).toBeUndefined();
      expect(conversationRepository.assignAtomic).toHaveBeenCalledWith(
        tenantId,
        conversationId,
        operatorId
      );
      expect(res.json).toHaveBeenCalledWith({ data: updatedConversation });
    });

    it('should throw BadRequestException when operator not found', async () => {
      const mockConversation = createMockConversation();

      conversationRepository.findById.mockResolvedValue(mockConversation);
      userRepository.findById.mockResolvedValue(null);

      const req = createMockRequest(
        { id: conversationId },
        { operatorId }
      );
      const res = createMockResponse();

      const error = await invokeHandler(controller.assignConversation, req, res);

      expect(error).toBeInstanceOf(BadRequestException);
    });

    it('should throw BadRequestException when operator is in different tenant', async () => {
      const mockConversation = createMockConversation();
      const mockOperator = { id: operatorId, tenantId: 'other-tenant' } as User;

      conversationRepository.findById.mockResolvedValue(mockConversation);
      userRepository.findById.mockResolvedValue(mockOperator);

      const req = createMockRequest(
        { id: conversationId },
        { operatorId }
      );
      const res = createMockResponse();

      const error = await invokeHandler(controller.assignConversation, req, res);

      expect(error).toBeInstanceOf(BadRequestException);
    });

    it('should return current conversation if already assigned to same operator', async () => {
      const mockConversation = createMockConversation({ assignedToId: operatorId });
      const mockOperator = { id: operatorId, tenantId } as User;

      conversationRepository.findById.mockResolvedValue(mockConversation);
      userRepository.findById.mockResolvedValue(mockOperator);
      conversationRepository.assignAtomic.mockResolvedValue({
        wasUpdated: false,
        previousAssignedToId: operatorId,
      });

      const req = createMockRequest(
        { id: conversationId },
        { operatorId }
      );
      const res = createMockResponse();

      const error = await invokeHandler(controller.assignConversation, req, res);

      expect(error).toBeUndefined();
      expect(res.json).toHaveBeenCalledWith({ data: mockConversation });
    });
  });

  describe('sendMessage', () => {
    it('should send a text message', async () => {
      const mockConversation = createMockConversation();
      const mockMessage = createMockMessage() as ConversationMessage;

      conversationRepository.findById.mockResolvedValue(mockConversation);
      messageRepository.create.mockResolvedValue(mockMessage);
      inboxMessageQueue.queueOutboundMessage.mockResolvedValue('job-123');

      const req = createMockRequest(
        { id: conversationId },
        {
          contentType: MessageContentType.TEXT,
          text: { content: 'Hello from agent' },
        }
      );
      const res = createMockResponse();

      const error = await invokeHandler(controller.sendMessage, req, res);

      expect(error).toBeUndefined();
      expect(messageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          conversationId,
          direction: MessageDirection.OUTBOUND,
          contentType: MessageContentType.TEXT,
          content: { body: 'Hello from agent' },
          deliveryStatus: MessageDeliveryStatus.PENDING,
        })
      );
      expect(inboxMessageQueue.queueOutboundMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          conversationId,
          messageId: mockMessage.id,
          channelAccountId,
          recipient: '+1234567890',
          contentType: MessageContentType.TEXT,
          content: { text: 'Hello from agent' },
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ data: mockMessage });
    });

    it('should send a template message', async () => {
      const mockConversation = createMockConversation();
      const mockMessage = createMockMessage() as ConversationMessage;

      conversationRepository.findById.mockResolvedValue(mockConversation);
      messageRepository.create.mockResolvedValue(mockMessage);
      inboxMessageQueue.queueOutboundMessage.mockResolvedValue('job-123');

      const req = createMockRequest(
        { id: conversationId },
        {
          contentType: MessageContentType.TEMPLATE,
          template: {
            name: 'welcome_message',
            language: 'en_US',
            variables: { body: { '1': 'John' } },
          },
        }
      );
      const res = createMockResponse();

      const error = await invokeHandler(controller.sendMessage, req, res);

      expect(error).toBeUndefined();
      expect(inboxMessageQueue.queueOutboundMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: MessageContentType.TEMPLATE,
          content: {
            templateName: 'welcome_message',
            templateLanguage: 'en_US',
            templateVariables: { body: { '1': 'John' } },
          },
        })
      );
    });

    it('should throw BadRequestException when conversation has no customer', async () => {
      const mockConversation = createMockConversation({ customer: null } as unknown as Partial<Conversation>);

      conversationRepository.findById.mockResolvedValue(mockConversation);

      const req = createMockRequest(
        { id: conversationId },
        {
          contentType: MessageContentType.TEXT,
          text: { content: 'Hello' },
        }
      );
      const res = createMockResponse();

      const error = await invokeHandler(controller.sendMessage, req, res);

      expect(error).toBeInstanceOf(BadRequestException);
    });

    it('should throw BadRequestException when text content is missing for text message', async () => {
      const mockConversation = createMockConversation();

      conversationRepository.findById.mockResolvedValue(mockConversation);

      const req = createMockRequest(
        { id: conversationId },
        {
          contentType: MessageContentType.TEXT,
          // Missing text content
        }
      );
      const res = createMockResponse();

      const error = await invokeHandler(controller.sendMessage, req, res);

      expect(error).toBeInstanceOf(BadRequestException);
    });

    it('should throw BadRequestException when media URL is missing for image message', async () => {
      const mockConversation = createMockConversation();

      conversationRepository.findById.mockResolvedValue(mockConversation);

      const req = createMockRequest(
        { id: conversationId },
        {
          contentType: MessageContentType.IMAGE,
          // Missing media content
        }
      );
      const res = createMockResponse();

      const error = await invokeHandler(controller.sendMessage, req, res);

      expect(error).toBeInstanceOf(BadRequestException);
    });

    it('should throw BadRequestException when template name is missing', async () => {
      const mockConversation = createMockConversation();

      conversationRepository.findById.mockResolvedValue(mockConversation);

      const req = createMockRequest(
        { id: conversationId },
        {
          contentType: MessageContentType.TEMPLATE,
          template: {
            language: 'en_US',
            // Missing name
          },
        }
      );
      const res = createMockResponse();

      const error = await invokeHandler(controller.sendMessage, req, res);

      expect(error).toBeInstanceOf(BadRequestException);
    });
  });

  describe('channel account scope validation', () => {
    it('should allow access when API key has no channel scope', async () => {
      const mockConversation = createMockConversation();
      const unscopedApiKey = createMockApiKey({ channelAccountId: null });

      conversationRepository.findById.mockResolvedValue(mockConversation);

      const req = createMockRequest({ id: conversationId }, {}, unscopedApiKey);
      const res = createMockResponse();

      const error = await invokeHandler(controller.getConversation, req, res);

      expect(error).toBeUndefined();
      expect(res.json).toHaveBeenCalledWith({ data: mockConversation });
    });

    it('should deny access when API key channel scope does not match', async () => {
      const mockConversation = createMockConversation({ channelAccountId: 'channel-A' });
      const scopedApiKey = createMockApiKey({ channelAccountId: 'channel-B' });

      conversationRepository.findById.mockResolvedValue(mockConversation);

      const req = createMockRequest({ id: conversationId }, {}, scopedApiKey);
      const res = createMockResponse();

      const error = await invokeHandler(controller.getConversation, req, res);

      expect(error).toBeInstanceOf(ForbiddenException);
    });
  });
});
