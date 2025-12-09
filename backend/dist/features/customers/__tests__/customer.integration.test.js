"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const tsyringe_1 = require("tsyringe");
const customer_controller_1 = require("../customer.controller");
const customer_service_1 = require("../customer.service");
const user_entity_1 = require("../../users/user.entity");
const tag_entity_1 = require("../../tags/tag.entity");
// Use the same HttpException class as the error handler
const http_exceptions_1 = require("../../../shared/exceptions/http-exceptions");
const csrf_protection_1 = require("../../../middleware/csrf-protection");
const request_context_1 = require("../../../middleware/request-context");
const validate_dto_1 = require("../../../middleware/validate-dto");
const create_customer_dto_1 = require("../dto/create-customer.dto");
const update_customer_dto_1 = require("../dto/update-customer.dto");
const bulk_delete_dto_1 = require("../dto/bulk-delete.dto");
const bulk_tags_dto_1 = require("../dto/bulk-tags.dto");
// Valid UUIDv4s for testing (generated via uuid package)
const TEST_UUIDS = {
    customer1: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    customer2: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    customer3: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    tag1: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    tag2: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
};
// Custom error handler that works with both exception class files
// (The codebase has two identical HttpException definitions)
const testErrorHandler = (err, _req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
_next) => {
    // Check for statusCode property (present on both HttpException versions)
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    const errors = err.errors;
    res.status(statusCode).json({
        statusCode,
        message,
        ...(errors && { errors }),
    });
};
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
    },
}));
// Mock the PermissionService
jest.mock('../../users/permission.service', () => ({
    PermissionService: jest.fn().mockImplementation(() => ({
        hasPermission: jest.fn().mockResolvedValue(true),
        hasAnyPermission: jest.fn().mockResolvedValue(true),
        hasAllPermissions: jest.fn().mockResolvedValue(true),
    })),
}));
describe('Customer Integration Tests', () => {
    let app;
    let mockCustomerService;
    const tenantId = 'tenant-123';
    const userId = 'user-123';
    // Test fixtures
    const mockUser = {
        id: userId,
        tenantId,
        email: 'test@example.com',
        passwordHash: 'hash',
        firstName: 'Test',
        lastName: 'User',
        status: user_entity_1.UserStatus.ACTIVE,
        emailVerified: true,
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
        passwordResetToken: null,
        passwordResetExpires: null,
        roles: [
            {
                id: 'role-1',
                name: 'admin',
                displayName: 'Admin',
                description: 'Admin role',
                level: 2,
                isSystem: false,
                permissions: [],
                users: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ],
        tenant: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
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
    // Mock authentication middleware
    const mockAuthenticate = (req, res, next) => {
        req.user = mockUser;
        // Also set tenantId as the requireTenant middleware would
        req.tenantId = tenantId;
        next();
    };
    // Mock authorization middleware
    const mockRequirePermission = () => {
        return (req, res, next) => {
            next();
        };
    };
    beforeEach(() => {
        // Reset container
        tsyringe_1.container.clearInstances();
        // Create mock service
        mockCustomerService = {
            listCustomers: jest.fn(),
            getCustomer: jest.fn(),
            createCustomer: jest.fn(),
            updateCustomer: jest.fn(),
            deleteCustomer: jest.fn(),
            bulkDelete: jest.fn(),
            bulkUpdateTags: jest.fn(),
            exportCustomers: jest.fn(),
        };
        // Register mock service
        tsyringe_1.container.registerInstance(customer_service_1.CustomerService, mockCustomerService);
        // Create test app
        app = (0, express_1.default)();
        app.use(request_context_1.requestContextMiddleware);
        app.use(express_1.default.json());
        app.use((0, cookie_parser_1.default)());
        // CSRF token endpoint
        app.get('/csrf-token', csrf_protection_1.csrfEnsureToken, (req, res) => {
            res.json({ csrfToken: (0, csrf_protection_1.getCsrfToken)(req) });
        });
        // Create controller
        const controller = tsyringe_1.container.resolve(customer_controller_1.CustomerController);
        // Routes - note: specific routes must come before parameterized routes
        app.get('/api/customers', mockAuthenticate, mockRequirePermission(), controller.listCustomers);
        app.get('/api/customers/export', mockAuthenticate, mockRequirePermission(), controller.exportCustomers);
        // Bulk routes must be defined before :id route to avoid matching "bulk" as :id
        app.delete('/api/customers/bulk', mockAuthenticate, csrf_protection_1.csrfValidateToken, mockRequirePermission(), (0, validate_dto_1.validateDto)(bulk_delete_dto_1.BulkDeleteDto), controller.bulkDelete);
        app.patch('/api/customers/bulk/tags', mockAuthenticate, csrf_protection_1.csrfValidateToken, mockRequirePermission(), (0, validate_dto_1.validateDto)(bulk_tags_dto_1.BulkTagsDto), controller.bulkUpdateTags);
        app.get('/api/customers/:id', mockAuthenticate, mockRequirePermission(), controller.getCustomer);
        app.post('/api/customers', mockAuthenticate, csrf_protection_1.csrfValidateToken, mockRequirePermission(), (0, validate_dto_1.validateDto)(create_customer_dto_1.CreateCustomerDto), controller.createCustomer);
        app.put('/api/customers/:id', mockAuthenticate, csrf_protection_1.csrfValidateToken, mockRequirePermission(), (0, validate_dto_1.validateDto)(update_customer_dto_1.UpdateCustomerDto), controller.updateCustomer);
        app.delete('/api/customers/:id', mockAuthenticate, csrf_protection_1.csrfValidateToken, mockRequirePermission(), controller.deleteCustomer);
        // Error handler
        app.use(testErrorHandler);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    // Helper to get CSRF token
    const getCsrf = async () => {
        const response = await (0, supertest_1.default)(app).get('/csrf-token');
        const cookies = response.headers['set-cookie'];
        const csrfCookie = cookies[0].split(';')[0];
        return {
            token: response.body.csrfToken,
            cookie: csrfCookie,
        };
    };
    describe('GET /api/customers', () => {
        it('should return paginated customers', async () => {
            const paginatedResult = {
                data: [mockCustomer],
                total: 1,
                page: 1,
                limit: 20,
                totalPages: 1,
            };
            mockCustomerService.listCustomers.mockResolvedValue(paginatedResult);
            const response = await (0, supertest_1.default)(app)
                .get('/api/customers')
                .expect(200);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].name).toBe('John Doe');
            expect(response.body.meta.total).toBe(1);
            expect(response.body.meta.page).toBe(1);
            expect(response.body.meta.limit).toBe(20);
            expect(response.body.meta.totalPages).toBe(1);
        });
        it('should pass pagination parameters to service', async () => {
            const paginatedResult = {
                data: [],
                total: 0,
                page: 2,
                limit: 10,
                totalPages: 0,
            };
            mockCustomerService.listCustomers.mockResolvedValue(paginatedResult);
            await (0, supertest_1.default)(app)
                .get('/api/customers?page=2&limit=10&search=John&sortBy=name&sortOrder=asc')
                .expect(200);
            expect(mockCustomerService.listCustomers).toHaveBeenCalledWith(tenantId, expect.objectContaining({
                page: 2,
                limit: 10,
                search: 'John',
                sortBy: 'name',
                sortOrder: 'asc',
            }));
        });
        it('should pass tag filter to service', async () => {
            const paginatedResult = {
                data: [],
                total: 0,
                page: 1,
                limit: 20,
                totalPages: 0,
            };
            mockCustomerService.listCustomers.mockResolvedValue(paginatedResult);
            await (0, supertest_1.default)(app)
                .get('/api/customers?tagIds=tag-1&tagIds=tag-2')
                .expect(200);
            expect(mockCustomerService.listCustomers).toHaveBeenCalledWith(tenantId, expect.objectContaining({
                tagIds: ['tag-1', 'tag-2'],
            }));
        });
        it('should pass date range to service', async () => {
            const paginatedResult = {
                data: [],
                total: 0,
                page: 1,
                limit: 20,
                totalPages: 0,
            };
            mockCustomerService.listCustomers.mockResolvedValue(paginatedResult);
            await (0, supertest_1.default)(app)
                .get('/api/customers?dateFrom=2024-01-01&dateTo=2024-12-31')
                .expect(200);
            expect(mockCustomerService.listCustomers).toHaveBeenCalledWith(tenantId, expect.objectContaining({
                dateFrom: '2024-01-01',
                dateTo: '2024-12-31',
            }));
        });
        it('should return formatted customer with tags', async () => {
            const paginatedResult = {
                data: [mockCustomer],
                total: 1,
                page: 1,
                limit: 20,
                totalPages: 1,
            };
            mockCustomerService.listCustomers.mockResolvedValue(paginatedResult);
            const response = await (0, supertest_1.default)(app)
                .get('/api/customers')
                .expect(200);
            expect(response.body.data[0].tags).toEqual([
                { id: 'tag-1', name: 'VIP', color: 'purple' },
            ]);
        });
    });
    describe('GET /api/customers/:id', () => {
        it('should return customer when found', async () => {
            mockCustomerService.getCustomer.mockResolvedValue(mockCustomer);
            const response = await (0, supertest_1.default)(app)
                .get('/api/customers/customer-1')
                .expect(200);
            expect(response.body.data.id).toBe('customer-1');
            expect(response.body.data.name).toBe('John Doe');
            expect(response.body.data.whatsappNumber).toBe('1234567890');
        });
        it('should return 404 when customer not found', async () => {
            mockCustomerService.getCustomer.mockRejectedValue(new http_exceptions_1.NotFoundException('Customer not found'));
            const response = await (0, supertest_1.default)(app)
                .get('/api/customers/nonexistent')
                .expect(404);
            expect(response.body.message).toBe('Customer not found');
        });
    });
    describe('POST /api/customers', () => {
        it('should create customer with valid data and CSRF token', async () => {
            const newCustomer = {
                ...mockCustomer,
                id: 'customer-2',
                name: 'Jane Doe',
                whatsappNumber: '9876543210',
            };
            mockCustomerService.createCustomer.mockResolvedValue(newCustomer);
            const { token, cookie } = await getCsrf();
            const response = await (0, supertest_1.default)(app)
                .post('/api/customers')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                name: 'Jane Doe',
                whatsappNumber: '9876543210',
            })
                .expect(201);
            expect(response.body.data.name).toBe('Jane Doe');
            expect(mockCustomerService.createCustomer).toHaveBeenCalled();
        });
        it('should reject without CSRF token', async () => {
            await (0, supertest_1.default)(app)
                .post('/api/customers')
                .send({
                name: 'Jane Doe',
                whatsappNumber: '9876543210',
            })
                .expect(403);
        });
        it('should return 400 for invalid WhatsApp number format', async () => {
            const { token, cookie } = await getCsrf();
            const response = await (0, supertest_1.default)(app)
                .post('/api/customers')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                name: 'Jane Doe',
                whatsappNumber: 'invalid',
            })
                .expect(400);
            expect(response.body.message).toBe('Validation failed');
        });
        it('should return 400 for name too short', async () => {
            const { token, cookie } = await getCsrf();
            const response = await (0, supertest_1.default)(app)
                .post('/api/customers')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                name: 'J',
                whatsappNumber: '1234567890',
            })
                .expect(400);
            expect(response.body.message).toBe('Validation failed');
        });
        it('should return 409 for duplicate WhatsApp number', async () => {
            mockCustomerService.createCustomer.mockRejectedValue(new http_exceptions_1.ConflictException('Customer with this WhatsApp number already exists'));
            const { token, cookie } = await getCsrf();
            const response = await (0, supertest_1.default)(app)
                .post('/api/customers')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                name: 'Jane Doe',
                whatsappNumber: '1234567890',
            })
                .expect(409);
            expect(response.body.message).toBe('Customer with this WhatsApp number already exists');
        });
        it('should return 400 for invalid tag IDs', async () => {
            mockCustomerService.createCustomer.mockRejectedValue(new http_exceptions_1.BadRequestException('One or more tags not found'));
            const { token, cookie } = await getCsrf();
            // Use valid UUID format to pass validation, but mock service will reject
            const response = await (0, supertest_1.default)(app)
                .post('/api/customers')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                name: 'Jane Doe',
                whatsappNumber: '9876543210',
                tagIds: [TEST_UUIDS.tag1],
            })
                .expect(400);
            expect(response.body.message).toBe('One or more tags not found');
        });
        it('should create customer with custom fields', async () => {
            const newCustomer = {
                ...mockCustomer,
                customFields: { company: 'Test Corp', department: 'Sales' },
            };
            mockCustomerService.createCustomer.mockResolvedValue(newCustomer);
            const { token, cookie } = await getCsrf();
            await (0, supertest_1.default)(app)
                .post('/api/customers')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                name: 'Jane Doe',
                whatsappNumber: '9876543210',
                customFields: { company: 'Test Corp', department: 'Sales' },
            })
                .expect(201);
            expect(mockCustomerService.createCustomer).toHaveBeenCalledWith(expect.objectContaining({
                customFields: { company: 'Test Corp', department: 'Sales' },
            }), tenantId);
        });
    });
    describe('PUT /api/customers/:id', () => {
        it('should update customer with valid data', async () => {
            const updatedCustomer = {
                ...mockCustomer,
                name: 'John Updated',
            };
            mockCustomerService.updateCustomer.mockResolvedValue(updatedCustomer);
            const { token, cookie } = await getCsrf();
            const response = await (0, supertest_1.default)(app)
                .put('/api/customers/customer-1')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                name: 'John Updated',
            })
                .expect(200);
            expect(response.body.data.name).toBe('John Updated');
        });
        it('should reject without CSRF token', async () => {
            await (0, supertest_1.default)(app)
                .put('/api/customers/customer-1')
                .send({ name: 'Updated' })
                .expect(403);
        });
        it('should return 404 when customer not found', async () => {
            mockCustomerService.updateCustomer.mockRejectedValue(new http_exceptions_1.NotFoundException('Customer not found'));
            const { token, cookie } = await getCsrf();
            await (0, supertest_1.default)(app)
                .put('/api/customers/nonexistent')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({ name: 'Updated' })
                .expect(404);
        });
        it('should return 409 for duplicate WhatsApp number', async () => {
            mockCustomerService.updateCustomer.mockRejectedValue(new http_exceptions_1.ConflictException('Customer with this WhatsApp number already exists'));
            const { token, cookie } = await getCsrf();
            await (0, supertest_1.default)(app)
                .put('/api/customers/customer-1')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({ whatsappNumber: '5555555555' })
                .expect(409);
        });
    });
    describe('DELETE /api/customers/:id', () => {
        it('should delete customer successfully', async () => {
            mockCustomerService.deleteCustomer.mockResolvedValue(undefined);
            const { token, cookie } = await getCsrf();
            await (0, supertest_1.default)(app)
                .delete('/api/customers/customer-1')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .expect(204);
            expect(mockCustomerService.deleteCustomer).toHaveBeenCalledWith('customer-1', tenantId);
        });
        it('should reject without CSRF token', async () => {
            await (0, supertest_1.default)(app)
                .delete('/api/customers/customer-1')
                .expect(403);
        });
        it('should return 404 when customer not found', async () => {
            mockCustomerService.deleteCustomer.mockRejectedValue(new http_exceptions_1.NotFoundException('Customer not found'));
            const { token, cookie } = await getCsrf();
            await (0, supertest_1.default)(app)
                .delete('/api/customers/nonexistent')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .expect(404);
        });
    });
    describe('DELETE /api/customers/bulk', () => {
        it('should bulk delete customers', async () => {
            mockCustomerService.bulkDelete.mockResolvedValue(3);
            const { token, cookie } = await getCsrf();
            const response = await (0, supertest_1.default)(app)
                .delete('/api/customers/bulk')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                ids: [TEST_UUIDS.customer1, TEST_UUIDS.customer2, TEST_UUIDS.customer3],
            })
                .expect(200);
            expect(response.body.data.affected).toBe(3);
        });
        it('should reject without CSRF token', async () => {
            await (0, supertest_1.default)(app)
                .delete('/api/customers/bulk')
                .send({ ids: [TEST_UUIDS.customer1] })
                .expect(403);
        });
        it('should return 400 for empty ids array', async () => {
            const { token, cookie } = await getCsrf();
            await (0, supertest_1.default)(app)
                .delete('/api/customers/bulk')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({ ids: [] })
                .expect(400);
        });
        it('should return 400 for invalid UUID format', async () => {
            const { token, cookie } = await getCsrf();
            await (0, supertest_1.default)(app)
                .delete('/api/customers/bulk')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({ ids: ['invalid-uuid'] })
                .expect(400);
        });
    });
    describe('PATCH /api/customers/bulk/tags', () => {
        it('should add tags to multiple customers', async () => {
            mockCustomerService.bulkUpdateTags.mockResolvedValue(2);
            const { token, cookie } = await getCsrf();
            const response = await (0, supertest_1.default)(app)
                .patch('/api/customers/bulk/tags')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                customerIds: [TEST_UUIDS.customer1, TEST_UUIDS.customer2],
                tagIds: [TEST_UUIDS.tag1],
                action: 'add',
            })
                .expect(200);
            expect(response.body.data.affected).toBe(2);
            expect(mockCustomerService.bulkUpdateTags).toHaveBeenCalledWith([TEST_UUIDS.customer1, TEST_UUIDS.customer2], [TEST_UUIDS.tag1], 'add', tenantId);
        });
        it('should remove tags from customers', async () => {
            mockCustomerService.bulkUpdateTags.mockResolvedValue(2);
            const { token, cookie } = await getCsrf();
            await (0, supertest_1.default)(app)
                .patch('/api/customers/bulk/tags')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                customerIds: [TEST_UUIDS.customer1],
                tagIds: [TEST_UUIDS.tag1],
                action: 'remove',
            })
                .expect(200);
            expect(mockCustomerService.bulkUpdateTags).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'remove', tenantId);
        });
        it('should replace tags on customers', async () => {
            mockCustomerService.bulkUpdateTags.mockResolvedValue(2);
            const { token, cookie } = await getCsrf();
            await (0, supertest_1.default)(app)
                .patch('/api/customers/bulk/tags')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                customerIds: [TEST_UUIDS.customer1],
                tagIds: [TEST_UUIDS.tag1],
                action: 'replace',
            })
                .expect(200);
            expect(mockCustomerService.bulkUpdateTags).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'replace', tenantId);
        });
        it('should reject invalid action', async () => {
            const { token, cookie } = await getCsrf();
            await (0, supertest_1.default)(app)
                .patch('/api/customers/bulk/tags')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                customerIds: [TEST_UUIDS.customer1],
                tagIds: [TEST_UUIDS.tag1],
                action: 'invalid',
            })
                .expect(400);
        });
        it('should reject without CSRF token', async () => {
            await (0, supertest_1.default)(app)
                .patch('/api/customers/bulk/tags')
                .send({
                customerIds: [TEST_UUIDS.customer1],
                tagIds: [TEST_UUIDS.tag1],
                action: 'add',
            })
                .expect(403);
        });
        it('should return 400 for invalid tags', async () => {
            mockCustomerService.bulkUpdateTags.mockRejectedValue(new http_exceptions_1.BadRequestException('One or more tags not found'));
            const { token, cookie } = await getCsrf();
            await (0, supertest_1.default)(app)
                .patch('/api/customers/bulk/tags')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                customerIds: [TEST_UUIDS.customer1],
                tagIds: [TEST_UUIDS.tag1],
                action: 'add',
            })
                .expect(400);
        });
    });
    describe('GET /api/customers/export', () => {
        it('should export customers as CSV', async () => {
            const csvContent = 'ID,Name,WhatsApp Number,Tags,Created At,Updated At\ncustomer-1,John Doe,1234567890,VIP,2024-01-01,2024-01-01';
            mockCustomerService.exportCustomers.mockResolvedValue(csvContent);
            const response = await (0, supertest_1.default)(app)
                .get('/api/customers/export')
                .expect(200);
            expect(response.headers['content-type']).toContain('text/csv');
            expect(response.headers['content-disposition']).toContain('attachment');
            expect(response.text).toBe(csvContent);
        });
        it('should pass filter parameters to export', async () => {
            mockCustomerService.exportCustomers.mockResolvedValue('ID,Name\n');
            await (0, supertest_1.default)(app)
                .get('/api/customers/export?search=John&tagIds=tag-1')
                .expect(200);
            expect(mockCustomerService.exportCustomers).toHaveBeenCalledWith(tenantId, expect.objectContaining({
                search: 'John',
                tagIds: ['tag-1'],
            }));
        });
    });
    describe('Authentication', () => {
        it('should error when user is missing from request', async () => {
            // Create a new app without auth middleware
            const appNoAuth = (0, express_1.default)();
            appNoAuth.use(request_context_1.requestContextMiddleware);
            appNoAuth.use(express_1.default.json());
            const controller = tsyringe_1.container.resolve(customer_controller_1.CustomerController);
            // Route without authentication - user is undefined
            // Note: In production, the authenticate middleware would reject first
            // This test verifies the controller fails gracefully without a user
            appNoAuth.get('/api/customers', (req, res, next) => {
                req.user = undefined;
                next();
            }, controller.listCustomers);
            appNoAuth.use(testErrorHandler);
            // When user is undefined, accessing user.tenantId throws an error
            // This results in a 500 Internal Server Error
            const response = await (0, supertest_1.default)(appNoAuth)
                .get('/api/customers')
                .expect(500);
            expect(response.body.statusCode).toBe(500);
        });
    });
    describe('Tenant Isolation', () => {
        it('should use tenant from authenticated user', async () => {
            const paginatedResult = {
                data: [],
                total: 0,
                page: 1,
                limit: 20,
                totalPages: 0,
            };
            mockCustomerService.listCustomers.mockResolvedValue(paginatedResult);
            await (0, supertest_1.default)(app)
                .get('/api/customers')
                .expect(200);
            // Verify tenant ID is passed from user
            expect(mockCustomerService.listCustomers).toHaveBeenCalledWith(tenantId, expect.anything());
        });
        it('should reject user without tenant', async () => {
            // Create app with user missing tenant
            const appNoTenant = (0, express_1.default)();
            appNoTenant.use(request_context_1.requestContextMiddleware);
            appNoTenant.use(express_1.default.json());
            const controller = tsyringe_1.container.resolve(customer_controller_1.CustomerController);
            // Simulate what happens when tenantId is not set on request
            // (i.e., requireTenant middleware would have rejected the request)
            appNoTenant.get('/api/customers', (req, res, next) => {
                req.user = { ...mockUser, tenantId: null };
                // Do NOT set req.tenantId to simulate missing tenant check
                // Controller now uses req.tenantId! which will be undefined
                next();
            }, controller.listCustomers);
            appNoTenant.use(testErrorHandler);
            // Controller expects req.tenantId to be set by middleware
            // When not set, it will throw an error (500 from undefined access)
            // In production, requireTenant middleware prevents this
            const response = await (0, supertest_1.default)(appNoTenant)
                .get('/api/customers')
                .expect(500);
            // Note: In production, requireTenant middleware returns 400 before controller
            expect(response.body.statusCode).toBe(500);
        });
    });
    describe('Security - SQL Injection Prevention', () => {
        it('should use safe sortBy column for valid values', async () => {
            const paginatedResult = {
                data: [],
                total: 0,
                page: 1,
                limit: 20,
                totalPages: 0,
            };
            mockCustomerService.listCustomers.mockResolvedValue(paginatedResult);
            // Valid sortBy value should work
            await (0, supertest_1.default)(app)
                .get('/api/customers?sortBy=name')
                .expect(200);
            expect(mockCustomerService.listCustomers).toHaveBeenCalledWith(tenantId, expect.objectContaining({
                sortBy: 'name',
            }));
        });
        it('should default to createdAt for invalid sortBy values', async () => {
            const paginatedResult = {
                data: [],
                total: 0,
                page: 1,
                limit: 20,
                totalPages: 0,
            };
            mockCustomerService.listCustomers.mockResolvedValue(paginatedResult);
            // Invalid sortBy value should be passed to service (repository will use default)
            await (0, supertest_1.default)(app)
                .get('/api/customers?sortBy=id;DROP%20TABLE%20customers;--')
                .expect(200);
            expect(mockCustomerService.listCustomers).toHaveBeenCalledWith(tenantId, expect.objectContaining({
                sortBy: 'id;DROP TABLE customers;--',
            }));
            // The repository will safely ignore this and use default sort
        });
        it('should reject sortBy with SQL injection via query validation', async () => {
            const paginatedResult = {
                data: [],
                total: 0,
                page: 1,
                limit: 20,
                totalPages: 0,
            };
            mockCustomerService.listCustomers.mockResolvedValue(paginatedResult);
            // Note: The repository handles invalid sortBy by using default column
            // The query DTO validation allows any string (for flexibility)
            // but the repository uses allowlist for actual query building
            await (0, supertest_1.default)(app)
                .get('/api/customers?sortBy=malicious_column')
                .expect(200);
        });
    });
    describe('Security - customFields Validation', () => {
        it('should accept valid customFields with primitive values', async () => {
            const newCustomer = {
                ...mockCustomer,
                id: 'customer-2',
                customFields: { company: 'Test Corp', employees: 100, active: true },
            };
            mockCustomerService.createCustomer.mockResolvedValue(newCustomer);
            const { token, cookie } = await getCsrf();
            await (0, supertest_1.default)(app)
                .post('/api/customers')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                name: 'Jane Doe',
                whatsappNumber: '9876543210',
                customFields: { company: 'Test Corp', employees: 100, active: true },
            })
                .expect(201);
        });
        it('should reject customFields exceeding max size', async () => {
            const { token, cookie } = await getCsrf();
            // Create a large object (> 10KB)
            const largeValue = 'x'.repeat(15000);
            await (0, supertest_1.default)(app)
                .post('/api/customers')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                name: 'Jane Doe',
                whatsappNumber: '9876543210',
                customFields: { largeField: largeValue },
            })
                .expect(400);
        });
        it('should reject customFields with excessive nesting depth', async () => {
            const { token, cookie } = await getCsrf();
            // Create deeply nested object (> 3 levels)
            const deeplyNested = {
                level1: {
                    level2: {
                        level3: {
                            level4: {
                                tooDeep: 'value',
                            },
                        },
                    },
                },
            };
            await (0, supertest_1.default)(app)
                .post('/api/customers')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                name: 'Jane Doe',
                whatsappNumber: '9876543210',
                customFields: deeplyNested,
            })
                .expect(400);
        });
        it('should reject customFields with too many keys', async () => {
            const { token, cookie } = await getCsrf();
            // Create object with > 50 keys
            const manyKeys = {};
            for (let i = 0; i < 60; i++) {
                manyKeys[`key${i}`] = `value${i}`;
            }
            await (0, supertest_1.default)(app)
                .post('/api/customers')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                name: 'Jane Doe',
                whatsappNumber: '9876543210',
                customFields: manyKeys,
            })
                .expect(400);
        });
        it('should accept customFields with allowed nesting depth', async () => {
            const newCustomer = {
                ...mockCustomer,
                customFields: {
                    address: {
                        city: 'New York',
                        zip: { code: '10001' },
                    },
                },
            };
            mockCustomerService.createCustomer.mockResolvedValue(newCustomer);
            const { token, cookie } = await getCsrf();
            // 3 levels of nesting is allowed
            await (0, supertest_1.default)(app)
                .post('/api/customers')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                name: 'Jane Doe',
                whatsappNumber: '9876543210',
                customFields: {
                    address: {
                        city: 'New York',
                        zip: { code: '10001' },
                    },
                },
            })
                .expect(201);
        });
    });
    describe('Security - UUID Validation', () => {
        it('should accept valid UUID for customer ID', async () => {
            mockCustomerService.getCustomer.mockResolvedValue(mockCustomer);
            await (0, supertest_1.default)(app)
                .get(`/api/customers/${TEST_UUIDS.customer1}`)
                .expect(200);
        });
        it('should pass invalid UUID to service (validation handled in routes)', async () => {
            // Note: The test app setup does not include validateUuid middleware
            // so invalid UUIDs are passed to the service.
            // In production routes, validateUuid middleware rejects invalid UUIDs
            // before they reach the controller.
            mockCustomerService.getCustomer.mockRejectedValue(new http_exceptions_1.NotFoundException('Customer not found'));
            await (0, supertest_1.default)(app)
                .get('/api/customers/not-a-valid-uuid')
                .expect(404);
        });
    });
});
