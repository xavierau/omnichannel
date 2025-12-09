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
const invitation_controller_1 = require("../invitation.controller");
const invitation_service_1 = require("../invitation.service");
const user_entity_1 = require("../../users/user.entity");
const invitation_entity_1 = require("../invitation.entity");
const http_exceptions_1 = require("../../../shared/exceptions/http-exceptions");
const csrf_protection_1 = require("../../../middleware/csrf-protection");
const request_context_1 = require("../../../middleware/request-context");
const validate_dto_1 = require("../../../middleware/validate-dto");
const invitation_dto_1 = require("../dto/invitation.dto");
// Valid UUIDs for testing
const TEST_UUIDS = {
    tenant: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    user: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    invitation: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
};
// Test error handler
const testErrorHandler = (err, _req, res, _next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    const errors = err.errors;
    res.status(statusCode).json({
        statusCode,
        message,
        ...(errors !== undefined && errors !== null && typeof errors === 'object' ? { errors } : {}),
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
describe('Invitation Integration Tests', () => {
    let app;
    let mockInvitationService;
    const tenantId = TEST_UUIDS.tenant;
    const userId = TEST_UUIDS.user;
    // Test fixtures
    const mockUser = {
        id: userId,
        tenantId,
        email: 'admin@example.com',
        passwordHash: 'hash',
        firstName: 'Admin',
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
    const mockInvitation = {
        id: TEST_UUIDS.invitation,
        email: 'invited@example.com',
        status: invitation_entity_1.InvitationStatus.PENDING,
        inviterName: 'Admin User',
        tenantName: 'Test Tenant',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
    };
    // Mock authentication middleware
    const mockAuthenticate = (req, res, next) => {
        req.user = mockUser;
        next();
    };
    beforeEach(() => {
        // Reset container
        tsyringe_1.container.clearInstances();
        // Create mock service
        mockInvitationService = {
            createInvitation: jest.fn(),
            validateInvitation: jest.fn(),
            acceptInvitation: jest.fn(),
            declineInvitation: jest.fn(),
            resendInvitation: jest.fn(),
            getInvitationsByTenant: jest.fn(),
            deleteInvitation: jest.fn(),
        };
        // Register mock service
        tsyringe_1.container.registerInstance(invitation_service_1.InvitationService, mockInvitationService);
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
        const controller = tsyringe_1.container.resolve(invitation_controller_1.InvitationController);
        // Routes - authenticated routes first
        app.get('/api/invitations', mockAuthenticate, controller.listInvitations);
        app.post('/api/invitations', mockAuthenticate, csrf_protection_1.csrfValidateToken, (0, validate_dto_1.validateDto)(invitation_dto_1.CreateInvitationDto), controller.createInvitation);
        app.post('/api/invitations/resend', mockAuthenticate, csrf_protection_1.csrfValidateToken, (0, validate_dto_1.validateDto)(invitation_dto_1.ResendInvitationDto), controller.resendInvitation);
        // Public routes with token param
        app.get('/api/invitations/:token', controller.validateInvitation);
        app.post('/api/invitations/:token/accept', (0, validate_dto_1.validateDto)(invitation_dto_1.AcceptInvitationDto), controller.acceptInvitation);
        app.post('/api/invitations/:token/decline', controller.declineInvitation);
        // Delete route
        app.delete('/api/invitations/:id', mockAuthenticate, csrf_protection_1.csrfValidateToken, controller.deleteInvitation);
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
    describe('POST /api/invitations - Create Invitation', () => {
        it('should create invitation with valid data and CSRF token', async () => {
            mockInvitationService.createInvitation.mockResolvedValue(mockInvitation);
            const { token, cookie } = await getCsrf();
            const response = await (0, supertest_1.default)(app)
                .post('/api/invitations')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                email: 'invited@example.com',
            })
                .expect(201);
            expect(response.body.data.email).toBe('invited@example.com');
            expect(response.body.data.status).toBe(invitation_entity_1.InvitationStatus.PENDING);
            expect(mockInvitationService.createInvitation).toHaveBeenCalledWith(tenantId, 'invited@example.com', userId);
        });
        it('should reject without CSRF token', async () => {
            await (0, supertest_1.default)(app)
                .post('/api/invitations')
                .send({
                email: 'invited@example.com',
            })
                .expect(403);
        });
        it('should return 400 for invalid email format', async () => {
            const { token, cookie } = await getCsrf();
            const response = await (0, supertest_1.default)(app)
                .post('/api/invitations')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                email: 'invalid-email',
            })
                .expect(400);
            expect(response.body.message).toBe('Validation failed');
        });
        it('should return 409 for duplicate invitation', async () => {
            mockInvitationService.createInvitation.mockRejectedValue(new http_exceptions_1.ConflictException('An invitation for this email is already pending'));
            const { token, cookie } = await getCsrf();
            const response = await (0, supertest_1.default)(app)
                .post('/api/invitations')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                email: 'invited@example.com',
            })
                .expect(409);
            expect(response.body.message).toContain('already pending');
        });
        it('should return 409 when user already exists in tenant', async () => {
            mockInvitationService.createInvitation.mockRejectedValue(new http_exceptions_1.ConflictException('A user with this email already exists in this tenant'));
            const { token, cookie } = await getCsrf();
            const response = await (0, supertest_1.default)(app)
                .post('/api/invitations')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                email: 'existing@example.com',
            })
                .expect(409);
            expect(response.body.message).toContain('already exists');
        });
    });
    describe('GET /api/invitations/:token - Validate Invitation', () => {
        it('should return valid invitation details', async () => {
            const validationResult = {
                valid: true,
                email: 'invited@example.com',
                tenantName: 'Test Tenant',
                inviterName: 'Admin User',
                expiresAt: mockInvitation.expiresAt,
            };
            mockInvitationService.validateInvitation.mockResolvedValue(validationResult);
            const response = await (0, supertest_1.default)(app)
                .get('/api/invitations/valid-token-123')
                .expect(200);
            expect(response.body.data.valid).toBe(true);
            expect(response.body.data.email).toBe('invited@example.com');
            expect(response.body.data.tenantName).toBe('Test Tenant');
        });
        it('should return invalid for expired token', async () => {
            const validationResult = {
                valid: false,
            };
            mockInvitationService.validateInvitation.mockResolvedValue(validationResult);
            const response = await (0, supertest_1.default)(app)
                .get('/api/invitations/expired-token')
                .expect(200);
            expect(response.body.data.valid).toBe(false);
            expect(response.body.data.email).toBeUndefined();
        });
        it('should return invalid for non-existent token', async () => {
            const validationResult = {
                valid: false,
            };
            mockInvitationService.validateInvitation.mockResolvedValue(validationResult);
            const response = await (0, supertest_1.default)(app)
                .get('/api/invitations/non-existent-token')
                .expect(200);
            expect(response.body.data.valid).toBe(false);
        });
    });
    describe('POST /api/invitations/:token/accept - Accept Invitation', () => {
        it('should accept invitation and create user', async () => {
            mockInvitationService.acceptInvitation.mockResolvedValue({
                userId: 'new-user-id',
                email: 'invited@example.com',
            });
            const response = await (0, supertest_1.default)(app)
                .post('/api/invitations/valid-token-123/accept')
                .send({
                password: 'SecurePassword123!',
                firstName: 'New',
                lastName: 'User',
            })
                .expect(201);
            expect(response.body.data.message).toContain('Account created successfully');
            expect(response.body.data.userId).toBe('new-user-id');
            expect(response.body.data.email).toBe('invited@example.com');
        });
        it('should return 400 for invalid token', async () => {
            mockInvitationService.acceptInvitation.mockRejectedValue(new http_exceptions_1.BadRequestException('Invalid or expired invitation token'));
            const response = await (0, supertest_1.default)(app)
                .post('/api/invitations/invalid-token/accept')
                .send({
                password: 'SecurePassword123!',
                firstName: 'New',
                lastName: 'User',
            })
                .expect(400);
            expect(response.body.message).toContain('Invalid or expired');
        });
        it('should return 400 for missing required fields', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/invitations/valid-token-123/accept')
                .send({
                password: 'SecurePassword123!',
                // Missing firstName and lastName
            })
                .expect(400);
            expect(response.body.message).toBe('Validation failed');
        });
        it('should return 400 for password too short', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/invitations/valid-token-123/accept')
                .send({
                password: 'short',
                firstName: 'New',
                lastName: 'User',
            })
                .expect(400);
            expect(response.body.message).toBe('Validation failed');
        });
        it('should return 409 when user already exists', async () => {
            mockInvitationService.acceptInvitation.mockRejectedValue(new http_exceptions_1.ConflictException('A user with this email already exists'));
            const response = await (0, supertest_1.default)(app)
                .post('/api/invitations/valid-token-123/accept')
                .send({
                password: 'SecurePassword123!',
                firstName: 'New',
                lastName: 'User',
            })
                .expect(409);
            expect(response.body.message).toContain('already exists');
        });
    });
    describe('POST /api/invitations/:token/decline - Decline Invitation', () => {
        it('should decline invitation successfully', async () => {
            mockInvitationService.declineInvitation.mockResolvedValue(undefined);
            const response = await (0, supertest_1.default)(app)
                .post('/api/invitations/valid-token-123/decline')
                .expect(200);
            expect(response.body.data.message).toContain('declined successfully');
            expect(mockInvitationService.declineInvitation).toHaveBeenCalledWith('valid-token-123');
        });
        it('should return 400 for invalid token', async () => {
            mockInvitationService.declineInvitation.mockRejectedValue(new http_exceptions_1.BadRequestException('Invalid invitation token'));
            const response = await (0, supertest_1.default)(app)
                .post('/api/invitations/invalid-token/decline')
                .expect(400);
            expect(response.body.message).toContain('Invalid');
        });
        it('should return 400 for already processed invitation', async () => {
            mockInvitationService.declineInvitation.mockRejectedValue(new http_exceptions_1.BadRequestException('This invitation has already been processed'));
            const response = await (0, supertest_1.default)(app)
                .post('/api/invitations/processed-token/decline')
                .expect(400);
            expect(response.body.message).toContain('already been processed');
        });
    });
    describe('POST /api/invitations/resend - Resend Invitation', () => {
        it('should resend invitation with new token', async () => {
            const updatedInvitation = {
                ...mockInvitation,
                expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            };
            mockInvitationService.resendInvitation.mockResolvedValue(updatedInvitation);
            const { token, cookie } = await getCsrf();
            const response = await (0, supertest_1.default)(app)
                .post('/api/invitations/resend')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                email: 'invited@example.com',
            })
                .expect(200);
            expect(response.body.data.email).toBe('invited@example.com');
            expect(mockInvitationService.resendInvitation).toHaveBeenCalledWith(tenantId, 'invited@example.com', userId);
        });
        it('should reject without CSRF token', async () => {
            await (0, supertest_1.default)(app)
                .post('/api/invitations/resend')
                .send({
                email: 'invited@example.com',
            })
                .expect(403);
        });
        it('should return 404 when no invitation found', async () => {
            mockInvitationService.resendInvitation.mockRejectedValue(new http_exceptions_1.NotFoundException('No invitation found for this email'));
            const { token, cookie } = await getCsrf();
            const response = await (0, supertest_1.default)(app)
                .post('/api/invitations/resend')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                email: 'unknown@example.com',
            })
                .expect(404);
            expect(response.body.message).toContain('No invitation found');
        });
        it('should return 400 for invalid email format', async () => {
            const { token, cookie } = await getCsrf();
            await (0, supertest_1.default)(app)
                .post('/api/invitations/resend')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                email: 'invalid-email',
            })
                .expect(400);
        });
    });
    describe('GET /api/invitations - List Invitations', () => {
        it('should return paginated invitations', async () => {
            const paginatedResult = {
                data: [mockInvitation],
                total: 1,
                page: 1,
                limit: 20,
                totalPages: 1,
            };
            mockInvitationService.getInvitationsByTenant.mockResolvedValue(paginatedResult);
            const response = await (0, supertest_1.default)(app)
                .get('/api/invitations')
                .expect(200);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].email).toBe('invited@example.com');
            expect(response.body.meta.total).toBe(1);
            expect(response.body.meta.page).toBe(1);
        });
        it('should pass pagination parameters to service', async () => {
            const paginatedResult = {
                data: [],
                total: 0,
                page: 2,
                limit: 10,
                totalPages: 0,
            };
            mockInvitationService.getInvitationsByTenant.mockResolvedValue(paginatedResult);
            await (0, supertest_1.default)(app)
                .get('/api/invitations?page=2&limit=10')
                .expect(200);
            expect(mockInvitationService.getInvitationsByTenant).toHaveBeenCalledWith(tenantId, expect.objectContaining({
                page: 2,
                limit: 10,
            }));
        });
        it('should filter by status', async () => {
            const paginatedResult = {
                data: [mockInvitation],
                total: 1,
                page: 1,
                limit: 20,
                totalPages: 1,
            };
            mockInvitationService.getInvitationsByTenant.mockResolvedValue(paginatedResult);
            await (0, supertest_1.default)(app)
                .get('/api/invitations?status=pending')
                .expect(200);
            expect(mockInvitationService.getInvitationsByTenant).toHaveBeenCalledWith(tenantId, expect.objectContaining({
                status: 'pending',
            }));
        });
        it('should return 400 for invalid status', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/invitations?status=invalid')
                .expect(400);
            expect(response.body.message).toContain('Invalid status');
        });
        it('should limit max results to 100', async () => {
            const paginatedResult = {
                data: [],
                total: 0,
                page: 1,
                limit: 100,
                totalPages: 0,
            };
            mockInvitationService.getInvitationsByTenant.mockResolvedValue(paginatedResult);
            await (0, supertest_1.default)(app)
                .get('/api/invitations?limit=500')
                .expect(200);
            expect(mockInvitationService.getInvitationsByTenant).toHaveBeenCalledWith(tenantId, expect.objectContaining({
                limit: 100, // Should be capped at 100
            }));
        });
    });
    describe('DELETE /api/invitations/:id - Delete Invitation', () => {
        it('should delete invitation successfully', async () => {
            mockInvitationService.deleteInvitation.mockResolvedValue(undefined);
            const { token, cookie } = await getCsrf();
            await (0, supertest_1.default)(app)
                .delete(`/api/invitations/${TEST_UUIDS.invitation}`)
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .expect(204);
            expect(mockInvitationService.deleteInvitation).toHaveBeenCalledWith(tenantId, TEST_UUIDS.invitation);
        });
        it('should reject without CSRF token', async () => {
            await (0, supertest_1.default)(app)
                .delete(`/api/invitations/${TEST_UUIDS.invitation}`)
                .expect(403);
        });
        it('should return 404 when invitation not found', async () => {
            mockInvitationService.deleteInvitation.mockRejectedValue(new http_exceptions_1.NotFoundException('Invitation not found'));
            const { token, cookie } = await getCsrf();
            const response = await (0, supertest_1.default)(app)
                .delete('/api/invitations/non-existent-id')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .expect(404);
            expect(response.body.message).toContain('not found');
        });
    });
    describe('Authentication Requirements', () => {
        it('should error when user is missing for authenticated routes', async () => {
            // Create a new app without auth middleware
            const appNoAuth = (0, express_1.default)();
            appNoAuth.use(request_context_1.requestContextMiddleware);
            appNoAuth.use(express_1.default.json());
            const controller = tsyringe_1.container.resolve(invitation_controller_1.InvitationController);
            // Route without authentication
            appNoAuth.get('/api/invitations', (req, res, next) => {
                req.user = undefined;
                next();
            }, controller.listInvitations);
            appNoAuth.use(testErrorHandler);
            const response = await (0, supertest_1.default)(appNoAuth)
                .get('/api/invitations')
                .expect(500);
            expect(response.body.statusCode).toBe(500);
        });
    });
    describe('Tenant Isolation', () => {
        it('should use tenant from authenticated user for create', async () => {
            mockInvitationService.createInvitation.mockResolvedValue(mockInvitation);
            const { token, cookie } = await getCsrf();
            await (0, supertest_1.default)(app)
                .post('/api/invitations')
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .send({
                email: 'invited@example.com',
            })
                .expect(201);
            expect(mockInvitationService.createInvitation).toHaveBeenCalledWith(tenantId, // Tenant from user
            expect.any(String), userId);
        });
        it('should use tenant from authenticated user for delete', async () => {
            mockInvitationService.deleteInvitation.mockResolvedValue(undefined);
            const { token, cookie } = await getCsrf();
            await (0, supertest_1.default)(app)
                .delete(`/api/invitations/${TEST_UUIDS.invitation}`)
                .set('Cookie', cookie)
                .set('X-CSRF-Token', token)
                .expect(204);
            expect(mockInvitationService.deleteInvitation).toHaveBeenCalledWith(tenantId, // Tenant from user
            TEST_UUIDS.invitation);
        });
    });
    describe('Security - Public Endpoints', () => {
        it('should allow validate without authentication', async () => {
            const validationResult = {
                valid: true,
                email: 'invited@example.com',
            };
            mockInvitationService.validateInvitation.mockResolvedValue(validationResult);
            // No auth headers, should still work
            await (0, supertest_1.default)(app)
                .get('/api/invitations/some-token')
                .expect(200);
        });
        it('should allow accept without authentication', async () => {
            mockInvitationService.acceptInvitation.mockResolvedValue({
                userId: 'new-user-id',
                email: 'invited@example.com',
            });
            // No auth headers, should still work
            await (0, supertest_1.default)(app)
                .post('/api/invitations/valid-token/accept')
                .send({
                password: 'SecurePassword123!',
                firstName: 'New',
                lastName: 'User',
            })
                .expect(201);
        });
        it('should allow decline without authentication', async () => {
            mockInvitationService.declineInvitation.mockResolvedValue(undefined);
            // No auth headers, should still work
            await (0, supertest_1.default)(app)
                .post('/api/invitations/valid-token/decline')
                .expect(200);
        });
    });
});
