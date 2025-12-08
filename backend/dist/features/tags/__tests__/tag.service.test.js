"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const tag_service_1 = require("../tag.service");
const tag_entity_1 = require("../tag.entity");
const http_exceptions_1 = require("../../../shared/exceptions/http-exceptions");
// Mock the auditLogger
jest.mock('../../../config/logger.config', () => ({
    auditLogger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));
describe('TagService', () => {
    let tagService;
    let mockTagRepository;
    const tenantId = 'tenant-123';
    // Test fixtures
    const mockTag = {
        id: 'tag-1',
        tenantId,
        name: 'VIP',
        color: tag_entity_1.TagColor.PURPLE,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tenant: {},
    };
    const mockTag2 = {
        id: 'tag-2',
        tenantId,
        name: 'Premium',
        color: tag_entity_1.TagColor.BLUE,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tenant: {},
    };
    beforeEach(() => {
        // Create mock repository instance
        mockTagRepository = {
            findById: jest.fn(),
            findByIds: jest.fn(),
            findByTenantId: jest.fn(),
            findByName: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            existsByName: jest.fn(),
        };
        // Create service instance with mocked dependency
        tagService = new tag_service_1.TagService(mockTagRepository);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('findAll', () => {
        it('should return all tags for tenant', async () => {
            const tags = [mockTag, mockTag2];
            mockTagRepository.findByTenantId.mockResolvedValue(tags);
            const result = await tagService.findAll(tenantId);
            expect(mockTagRepository.findByTenantId).toHaveBeenCalledWith(tenantId);
            expect(result).toEqual(tags);
            expect(result).toHaveLength(2);
        });
        it('should return empty array when no tags exist', async () => {
            mockTagRepository.findByTenantId.mockResolvedValue([]);
            const result = await tagService.findAll(tenantId);
            expect(result).toEqual([]);
            expect(result).toHaveLength(0);
        });
        it('should respect tenant isolation', async () => {
            mockTagRepository.findByTenantId.mockResolvedValue([]);
            await tagService.findAll('different-tenant');
            expect(mockTagRepository.findByTenantId).toHaveBeenCalledWith('different-tenant');
        });
    });
    describe('findById', () => {
        it('should return tag when found', async () => {
            mockTagRepository.findById.mockResolvedValue(mockTag);
            const result = await tagService.findById('tag-1', tenantId);
            expect(mockTagRepository.findById).toHaveBeenCalledWith('tag-1', tenantId);
            expect(result).toEqual(mockTag);
        });
        it('should throw NotFoundException when tag not found', async () => {
            mockTagRepository.findById.mockResolvedValue(null);
            await expect(tagService.findById('nonexistent', tenantId)).rejects.toThrow(http_exceptions_1.NotFoundException);
            await expect(tagService.findById('nonexistent', tenantId)).rejects.toThrow('Tag not found');
        });
        it('should respect tenant isolation', async () => {
            mockTagRepository.findById.mockResolvedValue(null);
            await expect(tagService.findById('tag-1', 'different-tenant')).rejects.toThrow(http_exceptions_1.NotFoundException);
            expect(mockTagRepository.findById).toHaveBeenCalledWith('tag-1', 'different-tenant');
        });
    });
    describe('findByIds', () => {
        it('should return tags matching provided IDs', async () => {
            const tags = [mockTag, mockTag2];
            mockTagRepository.findByIds.mockResolvedValue(tags);
            const result = await tagService.findByIds(['tag-1', 'tag-2'], tenantId);
            expect(mockTagRepository.findByIds).toHaveBeenCalledWith(['tag-1', 'tag-2'], tenantId);
            expect(result).toEqual(tags);
        });
        it('should return partial results when some IDs not found', async () => {
            mockTagRepository.findByIds.mockResolvedValue([mockTag]);
            const result = await tagService.findByIds(['tag-1', 'nonexistent'], tenantId);
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual(mockTag);
        });
        it('should return empty array when no IDs match', async () => {
            mockTagRepository.findByIds.mockResolvedValue([]);
            const result = await tagService.findByIds(['nonexistent'], tenantId);
            expect(result).toEqual([]);
        });
    });
    describe('create', () => {
        const createDto = {
            name: 'New Tag',
            color: tag_entity_1.TagColor.GREEN,
        };
        it('should create tag successfully', async () => {
            const newTag = {
                id: 'tag-3',
                tenantId,
                name: createDto.name,
                color: createDto.color,
                createdAt: new Date(),
                updatedAt: new Date(),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                tenant: {},
            };
            mockTagRepository.existsByName.mockResolvedValue(false);
            mockTagRepository.create.mockResolvedValue(newTag);
            const result = await tagService.create(createDto, tenantId);
            expect(mockTagRepository.existsByName).toHaveBeenCalledWith(createDto.name, tenantId);
            expect(mockTagRepository.create).toHaveBeenCalledWith({
                name: createDto.name,
                color: createDto.color,
                tenantId,
            });
            expect(result).toEqual(newTag);
        });
        it('should throw ConflictException for duplicate name', async () => {
            mockTagRepository.existsByName.mockResolvedValue(true);
            await expect(tagService.create(createDto, tenantId)).rejects.toThrow(http_exceptions_1.ConflictException);
            await expect(tagService.create(createDto, tenantId)).rejects.toThrow('Tag with this name already exists');
            expect(mockTagRepository.create).not.toHaveBeenCalled();
        });
        it('should allow same name in different tenant', async () => {
            const newTag = {
                ...mockTag,
                id: 'tag-3',
                tenantId: 'different-tenant',
            };
            mockTagRepository.existsByName.mockResolvedValue(false);
            mockTagRepository.create.mockResolvedValue(newTag);
            await tagService.create(createDto, 'different-tenant');
            expect(mockTagRepository.existsByName).toHaveBeenCalledWith(createDto.name, 'different-tenant');
        });
        it('should create tag with all color options', async () => {
            const colorOptions = Object.values(tag_entity_1.TagColor);
            for (const color of colorOptions) {
                const dto = { name: `Tag-${color}`, color };
                mockTagRepository.existsByName.mockResolvedValue(false);
                mockTagRepository.create.mockResolvedValue({
                    ...mockTag,
                    name: dto.name,
                    color,
                });
                const result = await tagService.create(dto, tenantId);
                expect(result.color).toBe(color);
            }
        });
    });
    describe('update', () => {
        const updateDto = {
            name: 'Updated Tag',
            color: tag_entity_1.TagColor.ORANGE,
        };
        it('should update tag successfully', async () => {
            const updatedTag = {
                ...mockTag,
                name: updateDto.name,
                color: updateDto.color,
            };
            mockTagRepository.findById.mockResolvedValue(mockTag);
            mockTagRepository.existsByName.mockResolvedValue(false);
            mockTagRepository.update.mockResolvedValue(updatedTag);
            const result = await tagService.update('tag-1', updateDto, tenantId);
            expect(mockTagRepository.findById).toHaveBeenCalledWith('tag-1', tenantId);
            expect(mockTagRepository.existsByName).toHaveBeenCalledWith(updateDto.name, tenantId, 'tag-1');
            expect(mockTagRepository.update).toHaveBeenCalledWith('tag-1', tenantId, updateDto);
            expect(result).toEqual(updatedTag);
        });
        it('should throw NotFoundException when tag not found', async () => {
            mockTagRepository.findById.mockResolvedValue(null);
            await expect(tagService.update('nonexistent', updateDto, tenantId)).rejects.toThrow(http_exceptions_1.NotFoundException);
            expect(mockTagRepository.update).not.toHaveBeenCalled();
        });
        it('should throw ConflictException for duplicate name', async () => {
            mockTagRepository.findById.mockResolvedValue(mockTag);
            mockTagRepository.existsByName.mockResolvedValue(true);
            await expect(tagService.update('tag-1', updateDto, tenantId)).rejects.toThrow(http_exceptions_1.ConflictException);
            await expect(tagService.update('tag-1', updateDto, tenantId)).rejects.toThrow('Tag with this name already exists');
            expect(mockTagRepository.update).not.toHaveBeenCalled();
        });
        it('should not check duplicate when name unchanged', async () => {
            const dtoSameName = {
                name: mockTag.name, // Same as current
                color: tag_entity_1.TagColor.RED,
            };
            mockTagRepository.findById.mockResolvedValue(mockTag);
            mockTagRepository.update.mockResolvedValue({
                ...mockTag,
                color: tag_entity_1.TagColor.RED,
            });
            await tagService.update('tag-1', dtoSameName, tenantId);
            expect(mockTagRepository.existsByName).not.toHaveBeenCalled();
        });
        it('should update only color when name not provided', async () => {
            const dtoColorOnly = {
                color: tag_entity_1.TagColor.PINK,
            };
            mockTagRepository.findById.mockResolvedValue(mockTag);
            mockTagRepository.update.mockResolvedValue({
                ...mockTag,
                color: tag_entity_1.TagColor.PINK,
            });
            await tagService.update('tag-1', dtoColorOnly, tenantId);
            expect(mockTagRepository.existsByName).not.toHaveBeenCalled();
            expect(mockTagRepository.update).toHaveBeenCalledWith('tag-1', tenantId, dtoColorOnly);
        });
        it('should throw NotFoundException if update returns null', async () => {
            mockTagRepository.findById.mockResolvedValue(mockTag);
            mockTagRepository.update.mockResolvedValue(null);
            await expect(tagService.update('tag-1', { color: tag_entity_1.TagColor.RED }, tenantId)).rejects.toThrow(http_exceptions_1.NotFoundException);
        });
    });
    describe('delete', () => {
        it('should delete tag successfully', async () => {
            mockTagRepository.findById.mockResolvedValue(mockTag);
            mockTagRepository.delete.mockResolvedValue(true);
            await expect(tagService.delete('tag-1', tenantId)).resolves.not.toThrow();
            expect(mockTagRepository.findById).toHaveBeenCalledWith('tag-1', tenantId);
            expect(mockTagRepository.delete).toHaveBeenCalledWith('tag-1', tenantId);
        });
        it('should throw NotFoundException when tag not found', async () => {
            mockTagRepository.findById.mockResolvedValue(null);
            await expect(tagService.delete('nonexistent', tenantId)).rejects.toThrow(http_exceptions_1.NotFoundException);
            expect(mockTagRepository.delete).not.toHaveBeenCalled();
        });
        it('should throw NotFoundException when delete fails', async () => {
            mockTagRepository.findById.mockResolvedValue(mockTag);
            mockTagRepository.delete.mockResolvedValue(false);
            await expect(tagService.delete('tag-1', tenantId)).rejects.toThrow(http_exceptions_1.NotFoundException);
        });
        it('should respect tenant isolation', async () => {
            mockTagRepository.findById.mockResolvedValue(null);
            await expect(tagService.delete('tag-1', 'different-tenant')).rejects.toThrow(http_exceptions_1.NotFoundException);
            expect(mockTagRepository.findById).toHaveBeenCalledWith('tag-1', 'different-tenant');
        });
    });
});
