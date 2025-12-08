"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const customer_service_1 = require("../customer.service");
const tag_entity_1 = require("../../tags/tag.entity");
const http_exceptions_1 = require("../../../shared/exceptions/http-exceptions");
// Mock the auditLogger
jest.mock('../../../config/logger.config', () => ({
    auditLogger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));
describe('CustomerService', () => {
    let customerService;
    let mockCustomerRepository;
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
        tenant: {},
    };
    const mockCustomer = {
        id: 'customer-1',
        tenantId,
        name: 'John Doe',
        whatsappNumber: '1234567890',
        customFields: { company: 'Acme Inc' },
        tags: [mockTag],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        tenant: {},
    };
    beforeEach(() => {
        // Create mock repository instances
        mockCustomerRepository = {
            findById: jest.fn(),
            findByWhatsApp: jest.fn(),
            findAll: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            bulkDelete: jest.fn(),
            bulkUpdateTags: jest.fn(),
            existsByWhatsApp: jest.fn(),
            count: jest.fn(),
            findAllForExport: jest.fn(),
        };
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
        // Create service instance with mocked dependencies
        customerService = new customer_service_1.CustomerService(mockCustomerRepository, mockTagRepository);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('listCustomers', () => {
        it('should return paginated customers with default options', async () => {
            const paginatedResult = {
                data: [mockCustomer],
                total: 1,
                page: 1,
                limit: 20,
                totalPages: 1,
            };
            mockCustomerRepository.findAll.mockResolvedValue(paginatedResult);
            const result = await customerService.listCustomers(tenantId, {});
            expect(mockCustomerRepository.findAll).toHaveBeenCalledWith(tenantId, {});
            expect(result).toEqual(paginatedResult);
            expect(result.data).toHaveLength(1);
            expect(result.data[0].name).toBe('John Doe');
        });
        it('should pass pagination options to repository', async () => {
            const options = {
                page: 2,
                limit: 10,
                search: 'John',
                tagIds: ['tag-1'],
                dateFrom: '2024-01-01',
                dateTo: '2024-12-31',
                sortBy: 'name',
                sortOrder: 'asc',
            };
            const paginatedResult = {
                data: [],
                total: 0,
                page: 2,
                limit: 10,
                totalPages: 0,
            };
            mockCustomerRepository.findAll.mockResolvedValue(paginatedResult);
            await customerService.listCustomers(tenantId, options);
            expect(mockCustomerRepository.findAll).toHaveBeenCalledWith(tenantId, options);
        });
        it('should return empty results when no customers match', async () => {
            const paginatedResult = {
                data: [],
                total: 0,
                page: 1,
                limit: 20,
                totalPages: 0,
            };
            mockCustomerRepository.findAll.mockResolvedValue(paginatedResult);
            const result = await customerService.listCustomers(tenantId, { search: 'nonexistent' });
            expect(result.data).toHaveLength(0);
            expect(result.total).toBe(0);
        });
    });
    describe('getCustomer', () => {
        it('should return customer when found', async () => {
            mockCustomerRepository.findById.mockResolvedValue(mockCustomer);
            const result = await customerService.getCustomer('customer-1', tenantId);
            expect(mockCustomerRepository.findById).toHaveBeenCalledWith('customer-1', tenantId);
            expect(result).toEqual(mockCustomer);
        });
        it('should throw NotFoundException when customer not found', async () => {
            mockCustomerRepository.findById.mockResolvedValue(null);
            await expect(customerService.getCustomer('nonexistent', tenantId)).rejects.toThrow(http_exceptions_1.NotFoundException);
            await expect(customerService.getCustomer('nonexistent', tenantId)).rejects.toThrow('Customer not found');
        });
        it('should respect tenant isolation', async () => {
            mockCustomerRepository.findById.mockResolvedValue(null);
            await expect(customerService.getCustomer('customer-1', 'different-tenant')).rejects.toThrow(http_exceptions_1.NotFoundException);
            expect(mockCustomerRepository.findById).toHaveBeenCalledWith('customer-1', 'different-tenant');
        });
    });
    describe('createCustomer', () => {
        const createDto = {
            name: 'Jane Doe',
            whatsappNumber: '9876543210',
            tagIds: ['tag-1'],
            customFields: { note: 'New customer' },
        };
        it('should create customer successfully', async () => {
            const newCustomer = {
                ...mockCustomer,
                id: 'customer-2',
                name: createDto.name,
                whatsappNumber: createDto.whatsappNumber,
                customFields: createDto.customFields,
            };
            mockCustomerRepository.existsByWhatsApp.mockResolvedValue(false);
            mockTagRepository.findByIds.mockResolvedValue([mockTag]);
            mockCustomerRepository.create.mockResolvedValue(newCustomer);
            const result = await customerService.createCustomer(createDto, tenantId);
            expect(mockCustomerRepository.existsByWhatsApp).toHaveBeenCalledWith(createDto.whatsappNumber, tenantId);
            expect(mockTagRepository.findByIds).toHaveBeenCalledWith(['tag-1'], tenantId);
            expect(mockCustomerRepository.create).toHaveBeenCalledWith({
                name: createDto.name,
                whatsappNumber: createDto.whatsappNumber,
                customFields: createDto.customFields,
                tenantId,
            }, [mockTag]);
            expect(result).toEqual(newCustomer);
        });
        it('should create customer without tags', async () => {
            const dtoWithoutTags = {
                name: 'Jane Doe',
                whatsappNumber: '9876543210',
            };
            const newCustomer = {
                ...mockCustomer,
                id: 'customer-2',
                name: dtoWithoutTags.name,
                whatsappNumber: dtoWithoutTags.whatsappNumber,
                tags: [],
            };
            mockCustomerRepository.existsByWhatsApp.mockResolvedValue(false);
            mockCustomerRepository.create.mockResolvedValue(newCustomer);
            await customerService.createCustomer(dtoWithoutTags, tenantId);
            expect(mockTagRepository.findByIds).not.toHaveBeenCalled();
            expect(mockCustomerRepository.create).toHaveBeenCalledWith({
                name: dtoWithoutTags.name,
                whatsappNumber: dtoWithoutTags.whatsappNumber,
                customFields: {},
                tenantId,
            }, undefined);
        });
        it('should throw ConflictException for duplicate WhatsApp number', async () => {
            mockCustomerRepository.existsByWhatsApp.mockResolvedValue(true);
            await expect(customerService.createCustomer(createDto, tenantId)).rejects.toThrow(http_exceptions_1.ConflictException);
            await expect(customerService.createCustomer(createDto, tenantId)).rejects.toThrow('Customer with this WhatsApp number already exists');
            expect(mockCustomerRepository.create).not.toHaveBeenCalled();
        });
        it('should throw BadRequestException when tags not found', async () => {
            mockCustomerRepository.existsByWhatsApp.mockResolvedValue(false);
            mockTagRepository.findByIds.mockResolvedValue([]); // No tags found
            await expect(customerService.createCustomer(createDto, tenantId)).rejects.toThrow(http_exceptions_1.BadRequestException);
            await expect(customerService.createCustomer(createDto, tenantId)).rejects.toThrow('One or more tags not found');
            expect(mockCustomerRepository.create).not.toHaveBeenCalled();
        });
        it('should throw BadRequestException when some tags not found', async () => {
            const dtoWithMultipleTags = {
                ...createDto,
                tagIds: ['tag-1', 'tag-2', 'tag-3'], // 3 tags requested
            };
            mockCustomerRepository.existsByWhatsApp.mockResolvedValue(false);
            mockTagRepository.findByIds.mockResolvedValue([mockTag]); // Only 1 found
            await expect(customerService.createCustomer(dtoWithMultipleTags, tenantId)).rejects.toThrow(http_exceptions_1.BadRequestException);
        });
    });
    describe('updateCustomer', () => {
        const updateDto = {
            name: 'John Updated',
            whatsappNumber: '5555555555',
        };
        it('should update customer successfully', async () => {
            const updatedCustomer = {
                ...mockCustomer,
                name: updateDto.name,
                whatsappNumber: updateDto.whatsappNumber,
            };
            mockCustomerRepository.findById.mockResolvedValue(mockCustomer);
            mockCustomerRepository.existsByWhatsApp.mockResolvedValue(false);
            mockCustomerRepository.update.mockResolvedValue(updatedCustomer);
            const result = await customerService.updateCustomer('customer-1', updateDto, tenantId);
            expect(mockCustomerRepository.findById).toHaveBeenCalledWith('customer-1', tenantId);
            expect(mockCustomerRepository.existsByWhatsApp).toHaveBeenCalledWith(updateDto.whatsappNumber, tenantId, 'customer-1');
            expect(result.name).toBe(updateDto.name);
        });
        it('should throw NotFoundException when customer not found', async () => {
            mockCustomerRepository.findById.mockResolvedValue(null);
            await expect(customerService.updateCustomer('nonexistent', updateDto, tenantId)).rejects.toThrow(http_exceptions_1.NotFoundException);
            expect(mockCustomerRepository.update).not.toHaveBeenCalled();
        });
        it('should throw ConflictException for duplicate WhatsApp number', async () => {
            mockCustomerRepository.findById.mockResolvedValue(mockCustomer);
            mockCustomerRepository.existsByWhatsApp.mockResolvedValue(true);
            await expect(customerService.updateCustomer('customer-1', updateDto, tenantId)).rejects.toThrow(http_exceptions_1.ConflictException);
            await expect(customerService.updateCustomer('customer-1', updateDto, tenantId)).rejects.toThrow('Customer with this WhatsApp number already exists');
        });
        it('should not check duplicate when WhatsApp number unchanged', async () => {
            const dtoSameWhatsApp = {
                name: 'Updated Name',
                whatsappNumber: mockCustomer.whatsappNumber, // Same as current
            };
            mockCustomerRepository.findById.mockResolvedValue(mockCustomer);
            mockCustomerRepository.update.mockResolvedValue({
                ...mockCustomer,
                name: 'Updated Name',
            });
            await customerService.updateCustomer('customer-1', dtoSameWhatsApp, tenantId);
            expect(mockCustomerRepository.existsByWhatsApp).not.toHaveBeenCalled();
        });
        it('should update tags when tagIds provided', async () => {
            const dtoWithTags = {
                tagIds: ['tag-1', 'tag-2'],
            };
            const tag2 = { ...mockTag, id: 'tag-2', name: 'Premium' };
            mockCustomerRepository.findById.mockResolvedValue(mockCustomer);
            mockTagRepository.findByIds.mockResolvedValue([mockTag, tag2]);
            mockCustomerRepository.update.mockResolvedValue({
                ...mockCustomer,
                tags: [mockTag, tag2],
            });
            await customerService.updateCustomer('customer-1', dtoWithTags, tenantId);
            expect(mockTagRepository.findByIds).toHaveBeenCalledWith(['tag-1', 'tag-2'], tenantId);
            expect(mockCustomerRepository.update).toHaveBeenCalledWith('customer-1', tenantId, {}, [mockTag, tag2]);
        });
        it('should clear tags when empty tagIds provided', async () => {
            const dtoEmptyTags = {
                tagIds: [],
            };
            mockCustomerRepository.findById.mockResolvedValue(mockCustomer);
            mockCustomerRepository.update.mockResolvedValue({
                ...mockCustomer,
                tags: [],
            });
            await customerService.updateCustomer('customer-1', dtoEmptyTags, tenantId);
            expect(mockTagRepository.findByIds).not.toHaveBeenCalled();
            expect(mockCustomerRepository.update).toHaveBeenCalledWith('customer-1', tenantId, {}, []);
        });
        it('should merge custom fields', async () => {
            const dtoWithCustomFields = {
                customFields: { newField: 'value' },
            };
            mockCustomerRepository.findById.mockResolvedValue(mockCustomer);
            mockCustomerRepository.update.mockResolvedValue({
                ...mockCustomer,
                customFields: { company: 'Acme Inc', newField: 'value' },
            });
            await customerService.updateCustomer('customer-1', dtoWithCustomFields, tenantId);
            expect(mockCustomerRepository.update).toHaveBeenCalledWith('customer-1', tenantId, {
                customFields: { company: 'Acme Inc', newField: 'value' },
            }, undefined);
        });
        it('should throw NotFoundException if update returns null', async () => {
            mockCustomerRepository.findById.mockResolvedValue(mockCustomer);
            mockCustomerRepository.update.mockResolvedValue(null);
            await expect(customerService.updateCustomer('customer-1', { name: 'New Name' }, tenantId)).rejects.toThrow(http_exceptions_1.NotFoundException);
        });
    });
    describe('deleteCustomer', () => {
        it('should delete customer successfully', async () => {
            mockCustomerRepository.findById.mockResolvedValue(mockCustomer);
            mockCustomerRepository.delete.mockResolvedValue(true);
            await expect(customerService.deleteCustomer('customer-1', tenantId)).resolves.not.toThrow();
            expect(mockCustomerRepository.findById).toHaveBeenCalledWith('customer-1', tenantId);
            expect(mockCustomerRepository.delete).toHaveBeenCalledWith('customer-1', tenantId);
        });
        it('should throw NotFoundException when customer not found', async () => {
            mockCustomerRepository.findById.mockResolvedValue(null);
            await expect(customerService.deleteCustomer('nonexistent', tenantId)).rejects.toThrow(http_exceptions_1.NotFoundException);
            expect(mockCustomerRepository.delete).not.toHaveBeenCalled();
        });
        it('should throw NotFoundException when delete fails', async () => {
            mockCustomerRepository.findById.mockResolvedValue(mockCustomer);
            mockCustomerRepository.delete.mockResolvedValue(false);
            await expect(customerService.deleteCustomer('customer-1', tenantId)).rejects.toThrow(http_exceptions_1.NotFoundException);
        });
    });
    describe('bulkDelete', () => {
        it('should delete multiple customers and return affected count', async () => {
            const ids = ['customer-1', 'customer-2', 'customer-3'];
            mockCustomerRepository.bulkDelete.mockResolvedValue(3);
            const result = await customerService.bulkDelete(ids, tenantId);
            expect(mockCustomerRepository.bulkDelete).toHaveBeenCalledWith(ids, tenantId);
            expect(result).toBe(3);
        });
        it('should return partial count when some customers belong to different tenant', async () => {
            const ids = ['customer-1', 'customer-2'];
            mockCustomerRepository.bulkDelete.mockResolvedValue(1); // Only 1 deleted
            const result = await customerService.bulkDelete(ids, tenantId);
            expect(result).toBe(1);
        });
        it('should return 0 when no customers found', async () => {
            mockCustomerRepository.bulkDelete.mockResolvedValue(0);
            const result = await customerService.bulkDelete(['nonexistent'], tenantId);
            expect(result).toBe(0);
        });
    });
    describe('bulkUpdateTags', () => {
        const customerIds = ['customer-1', 'customer-2'];
        const tagIds = ['tag-1', 'tag-2'];
        it('should add tags to multiple customers', async () => {
            mockTagRepository.findByIds.mockResolvedValue([mockTag, { ...mockTag, id: 'tag-2' }]);
            mockCustomerRepository.bulkUpdateTags.mockResolvedValue(2);
            const result = await customerService.bulkUpdateTags(customerIds, tagIds, 'add', tenantId);
            expect(mockTagRepository.findByIds).toHaveBeenCalledWith(tagIds, tenantId);
            expect(mockCustomerRepository.bulkUpdateTags).toHaveBeenCalledWith(customerIds, [mockTag, { ...mockTag, id: 'tag-2' }], 'add', tenantId);
            expect(result).toBe(2);
        });
        it('should remove tags from multiple customers', async () => {
            mockTagRepository.findByIds.mockResolvedValue([mockTag]);
            mockCustomerRepository.bulkUpdateTags.mockResolvedValue(2);
            const result = await customerService.bulkUpdateTags(customerIds, ['tag-1'], 'remove', tenantId);
            expect(mockCustomerRepository.bulkUpdateTags).toHaveBeenCalledWith(customerIds, [mockTag], 'remove', tenantId);
            expect(result).toBe(2);
        });
        it('should replace tags on multiple customers', async () => {
            mockTagRepository.findByIds.mockResolvedValue([mockTag]);
            mockCustomerRepository.bulkUpdateTags.mockResolvedValue(2);
            const result = await customerService.bulkUpdateTags(customerIds, ['tag-1'], 'replace', tenantId);
            expect(mockCustomerRepository.bulkUpdateTags).toHaveBeenCalledWith(customerIds, [mockTag], 'replace', tenantId);
            expect(result).toBe(2);
        });
        it('should throw BadRequestException when tags not found', async () => {
            mockTagRepository.findByIds.mockResolvedValue([]); // No tags found
            await expect(customerService.bulkUpdateTags(customerIds, tagIds, 'add', tenantId)).rejects.toThrow(http_exceptions_1.BadRequestException);
            await expect(customerService.bulkUpdateTags(customerIds, tagIds, 'add', tenantId)).rejects.toThrow('One or more tags not found');
            expect(mockCustomerRepository.bulkUpdateTags).not.toHaveBeenCalled();
        });
        it('should allow empty tagIds for replace action', async () => {
            mockCustomerRepository.bulkUpdateTags.mockResolvedValue(2);
            const result = await customerService.bulkUpdateTags(customerIds, [], 'replace', tenantId);
            expect(mockTagRepository.findByIds).not.toHaveBeenCalled();
            expect(mockCustomerRepository.bulkUpdateTags).toHaveBeenCalledWith(customerIds, [], 'replace', tenantId);
            expect(result).toBe(2);
        });
    });
    describe('exportCustomers', () => {
        it('should generate CSV with correct headers', async () => {
            mockCustomerRepository.findAllForExport.mockResolvedValue([mockCustomer]);
            const csv = await customerService.exportCustomers(tenantId, {});
            expect(csv).toContain('ID,Name,WhatsApp Number,Tags,Created At,Updated At');
            expect(mockCustomerRepository.findAllForExport).toHaveBeenCalledWith(tenantId, {});
        });
        it('should include customer data in CSV', async () => {
            mockCustomerRepository.findAllForExport.mockResolvedValue([mockCustomer]);
            const csv = await customerService.exportCustomers(tenantId, {});
            expect(csv).toContain(mockCustomer.id);
            expect(csv).toContain(mockCustomer.name);
            expect(csv).toContain(mockCustomer.whatsappNumber);
            expect(csv).toContain('VIP'); // Tag name
        });
        it('should handle multiple customers', async () => {
            const customer2 = {
                ...mockCustomer,
                id: 'customer-2',
                name: 'Jane Smith',
                whatsappNumber: '9876543210',
                tags: [],
            };
            mockCustomerRepository.findAllForExport.mockResolvedValue([mockCustomer, customer2]);
            const csv = await customerService.exportCustomers(tenantId, {});
            const lines = csv.split('\n');
            expect(lines).toHaveLength(3); // Header + 2 data rows
            expect(lines[1]).toContain('John Doe');
            expect(lines[2]).toContain('Jane Smith');
        });
        it('should escape CSV injection characters', async () => {
            const maliciousCustomer = {
                ...mockCustomer,
                name: '=cmd|calc',
            };
            mockCustomerRepository.findAllForExport.mockResolvedValue([maliciousCustomer]);
            const csv = await customerService.exportCustomers(tenantId, {});
            // Should be escaped with quotes and prefix
            expect(csv).not.toContain(',=cmd|calc,');
            expect(csv).toContain("\"'=cmd|calc\"");
        });
        it('should escape formula injection with plus sign', async () => {
            const maliciousCustomer = {
                ...mockCustomer,
                name: '+1+2',
            };
            mockCustomerRepository.findAllForExport.mockResolvedValue([maliciousCustomer]);
            const csv = await customerService.exportCustomers(tenantId, {});
            expect(csv).toContain("\"'+1+2\"");
        });
        it('should escape formula injection with minus sign', async () => {
            const maliciousCustomer = {
                ...mockCustomer,
                name: '-1-2',
            };
            mockCustomerRepository.findAllForExport.mockResolvedValue([maliciousCustomer]);
            const csv = await customerService.exportCustomers(tenantId, {});
            expect(csv).toContain("\"'-1-2\"");
        });
        it('should escape formula injection with at sign', async () => {
            const maliciousCustomer = {
                ...mockCustomer,
                name: '@SUM(A1)',
            };
            mockCustomerRepository.findAllForExport.mockResolvedValue([maliciousCustomer]);
            const csv = await customerService.exportCustomers(tenantId, {});
            expect(csv).toContain("\"'@SUM(A1)\"");
        });
        it('should escape fields containing commas', async () => {
            const customerWithComma = {
                ...mockCustomer,
                name: 'Doe, John',
            };
            mockCustomerRepository.findAllForExport.mockResolvedValue([customerWithComma]);
            const csv = await customerService.exportCustomers(tenantId, {});
            expect(csv).toContain('"Doe, John"');
        });
        it('should escape fields containing quotes', async () => {
            const customerWithQuote = {
                ...mockCustomer,
                name: 'John "Johnny" Doe',
            };
            mockCustomerRepository.findAllForExport.mockResolvedValue([customerWithQuote]);
            const csv = await customerService.exportCustomers(tenantId, {});
            expect(csv).toContain('"John ""Johnny"" Doe"');
        });
        it('should pass query options to repository', async () => {
            const options = {
                search: 'John',
                tagIds: ['tag-1'],
                dateFrom: '2024-01-01',
                dateTo: '2024-12-31',
            };
            mockCustomerRepository.findAllForExport.mockResolvedValue([]);
            await customerService.exportCustomers(tenantId, options);
            expect(mockCustomerRepository.findAllForExport).toHaveBeenCalledWith(tenantId, options);
        });
        it('should return empty CSV when no customers found', async () => {
            mockCustomerRepository.findAllForExport.mockResolvedValue([]);
            const csv = await customerService.exportCustomers(tenantId, {});
            const lines = csv.split('\n');
            expect(lines).toHaveLength(1); // Only header
            expect(lines[0]).toContain('ID,Name,WhatsApp Number');
        });
        it('should join multiple tag names with comma', async () => {
            const customerWithMultipleTags = {
                ...mockCustomer,
                tags: [
                    mockTag,
                    { ...mockTag, id: 'tag-2', name: 'Premium' },
                ],
            };
            mockCustomerRepository.findAllForExport.mockResolvedValue([customerWithMultipleTags]);
            const csv = await customerService.exportCustomers(tenantId, {});
            expect(csv).toContain('VIP, Premium');
        });
    });
});
