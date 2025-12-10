"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const conversation_repository_1 = require("../conversation.repository");
const enums_1 = require("../../enums");
const database_config_1 = require("../../../../config/database.config");
/**
 * Test suite for ConversationRepository.
 * Focuses on ensuring nested channel relation is loaded properly.
 */
describe('ConversationRepository - Nested Relations', () => {
    let repository;
    let mockTypeOrmRepository;
    const tenantId = 'tenant-123';
    const userId = 'user-456';
    const conversationId = 'conv-789';
    const channelAccountId = 'channel-account-111';
    const createMockConversation = (includeChannel = true) => {
        const conversation = {
            id: conversationId,
            tenantId,
            channelAccountId,
            customerId: 'customer-222',
            status: enums_1.ConversationStatus.ACTIVE,
            assignedToId: userId,
            unreadCount: 0,
            lastMessageAt: new Date(),
            lastMessagePreview: 'Test message',
            lastMessageDirection: null,
            lastCustomerMessageAt: null,
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            customer: {
                id: 'customer-222',
                tenantId,
                whatsappNumber: '+1234567890',
                name: 'John Doe',
            },
            assignedTo: {
                id: userId,
                email: 'user@example.com',
                name: 'Jane Operator',
            },
            channelAccount: {
                id: channelAccountId,
                tenantId,
                name: 'Support Line',
                phoneNumber: '+1555-0123',
                channel: includeChannel ? {
                    id: 'channel-whatsapp',
                    code: 'whatsapp',
                    name: 'WhatsApp',
                    description: 'WhatsApp messaging channel',
                    isActive: true,
                } : undefined,
            },
        };
        return conversation;
    };
    beforeEach(() => {
        // Mock TypeORM repository
        mockTypeOrmRepository = {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
        };
        // Mock AppDataSource.getRepository
        jest.spyOn(database_config_1.AppDataSource, 'getRepository').mockReturnValue(mockTypeOrmRepository);
        repository = new conversation_repository_1.ConversationRepository();
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('findById', () => {
        it('should include channelAccount.channel relation', async () => {
            const mockConversation = createMockConversation();
            mockTypeOrmRepository.findOne.mockResolvedValue(mockConversation);
            const result = await repository.findById(tenantId, conversationId);
            expect(result).toBeDefined();
            expect(result?.channelAccount).toBeDefined();
            expect(result?.channelAccount.channel).toBeDefined();
            expect(result?.channelAccount.channel.code).toBe('whatsapp');
            expect(result?.channelAccount.channel.name).toBe('WhatsApp');
            // Verify the repository was called with correct relations array
            expect(mockTypeOrmRepository.findOne).toHaveBeenCalledWith({
                where: { id: conversationId, tenantId },
                relations: ['customer', 'assignedTo', 'channelAccount', 'channelAccount.channel'],
            });
        });
        it('should include channel account details', async () => {
            const mockConversation = createMockConversation();
            mockTypeOrmRepository.findOne.mockResolvedValue(mockConversation);
            const result = await repository.findById(tenantId, conversationId);
            expect(result?.channelAccount.name).toBe('Support Line');
            expect(result?.channelAccount.phoneNumber).toBe('+1555-0123');
        });
    });
    describe('findByCustomerAndChannel', () => {
        it('should include channelAccount.channel relation', async () => {
            const mockConversation = createMockConversation();
            const customerId = 'customer-222';
            mockTypeOrmRepository.findOne.mockResolvedValue(mockConversation);
            const result = await repository.findByCustomerAndChannel(tenantId, customerId, channelAccountId);
            expect(result).toBeDefined();
            expect(result?.channelAccount).toBeDefined();
            expect(result?.channelAccount.channel).toBeDefined();
            expect(result?.channelAccount.channel.code).toBe('whatsapp');
            // Verify the repository was called with correct relations array
            expect(mockTypeOrmRepository.findOne).toHaveBeenCalledWith({
                where: { tenantId, customerId, channelAccountId },
                relations: ['customer', 'assignedTo', 'channelAccount', 'channelAccount.channel'],
            });
        });
    });
    describe('findAllForOperator', () => {
        it('should include channelAccount.channel relation via query builder', async () => {
            const mockConversations = [createMockConversation()];
            const mockQueryBuilder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([mockConversations, 1]),
            };
            mockTypeOrmRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
            const result = await repository.findAllForOperator(tenantId, userId, [channelAccountId], { page: 1, limit: 20 });
            expect(result.data).toHaveLength(1);
            expect(result.data[0].channelAccount).toBeDefined();
            expect(result.data[0].channelAccount.channel).toBeDefined();
            expect(result.data[0].channelAccount.channel.code).toBe('whatsapp');
            // Verify query builder included the channel join
            expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('conversation.customer', 'customer');
            expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('conversation.assignedTo', 'assignedTo');
            expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('conversation.channelAccount', 'channelAccount');
            expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('channelAccount.channel', 'channel');
        });
        it('should properly filter by accessible channel accounts', async () => {
            const mockQueryBuilder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
            };
            mockTypeOrmRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
            await repository.findAllForOperator(tenantId, userId, [channelAccountId], { page: 1, limit: 20 });
            // Verify tenant isolation
            expect(mockQueryBuilder.where).toHaveBeenCalledWith('conversation.tenant_id = :tenantId', { tenantId });
            // Verify channel account access control
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('conversation.channel_account_id IN (:...channelAccountIds)', { channelAccountIds: [channelAccountId] });
            // Verify assignment filtering
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('(conversation.assigned_to_id = :userId OR conversation.assigned_to_id IS NULL)', { userId });
        });
    });
});
