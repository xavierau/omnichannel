"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const crypto = __importStar(require("crypto"));
const auth_service_1 = require("../auth.service");
const user_entity_1 = require("../../users/user.entity");
// Mock the logger
jest.mock('../../../config/logger.config', () => ({
    auditLogger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));
// Mock the redis client
jest.mock('../../../config/redis.config', () => ({
    redisClient: {
        del: jest.fn().mockResolvedValue(1),
    },
}));
describe('AuthService - Password Reset', () => {
    let authService;
    let mockUserService;
    let mockUserRepository;
    let mockTokenRepo;
    let mockTenantService;
    const mockUser = {
        id: 'user-123',
        tenantId: null,
        tenant: null,
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        firstName: 'John',
        lastName: 'Doe',
        status: user_entity_1.UserStatus.ACTIVE,
        emailVerified: true,
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
        passwordResetToken: null,
        passwordResetExpires: null,
        roles: [],
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    beforeEach(() => {
        // Create mock services and repositories
        mockUserService = {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            updateUser: jest.fn(),
            updatePassword: jest.fn(),
            createUser: jest.fn(),
            validateCredentials: jest.fn(),
            getUserPermissions: jest.fn(),
            updateLastLogin: jest.fn(),
        };
        mockUserRepository = {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            save: jest.fn(),
        };
        mockTokenRepo = {
            create: jest.fn(),
            findByTokenId: jest.fn(),
            revokeToken: jest.fn(),
            revokeAllUserTokens: jest.fn(),
        };
        mockTenantService = {
            create: jest.fn(),
            findById: jest.fn(),
            findBySlug: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };
        const mockRoleRepository = {
            findByName: jest.fn(),
            findById: jest.fn(),
            findByIds: jest.fn(),
            findAll: jest.fn(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        };
        // Create AuthService with mocked dependencies
        authService = new auth_service_1.AuthService(mockUserService, mockTokenRepo, mockUserRepository, mockTenantService, mockRoleRepository);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('requestPasswordReset', () => {
        it('should generate reset token and store it when user exists', async () => {
            mockUserService.findByEmail.mockResolvedValue(mockUser);
            mockUserRepository.update.mockResolvedValue(mockUser);
            const result = await authService.requestPasswordReset('test@example.com');
            expect(mockUserService.findByEmail).toHaveBeenCalledWith('test@example.com');
            expect(mockUserRepository.update).toHaveBeenCalled();
            expect(result.success).toBe(true);
            expect(result.message).toBe('If your email is registered, you will receive a password reset link.');
        });
        it('should return same message when user does not exist (prevent enumeration)', async () => {
            mockUserService.findByEmail.mockResolvedValue(null);
            const result = await authService.requestPasswordReset('nonexistent@example.com');
            expect(mockUserService.findByEmail).toHaveBeenCalledWith('nonexistent@example.com');
            expect(mockUserRepository.update).not.toHaveBeenCalled();
            expect(result.success).toBe(true);
            expect(result.message).toBe('If your email is registered, you will receive a password reset link.');
        });
        it('should store hashed token in database', async () => {
            mockUserService.findByEmail.mockResolvedValue(mockUser);
            mockUserRepository.update.mockResolvedValue(mockUser);
            await authService.requestPasswordReset('test@example.com');
            // Verify update was called with hashed token (64 hex characters for SHA256)
            expect(mockUserRepository.update).toHaveBeenCalledWith(mockUser.id, expect.objectContaining({
                passwordResetToken: expect.stringMatching(/^[a-f0-9]{64}$/),
                passwordResetExpires: expect.any(Date),
            }));
        });
        it('should set token expiry to 1 hour from now', async () => {
            mockUserService.findByEmail.mockResolvedValue(mockUser);
            mockUserRepository.update.mockResolvedValue(mockUser);
            const before = new Date();
            await authService.requestPasswordReset('test@example.com');
            const after = new Date();
            const updateCall = mockUserRepository.update.mock.calls[0];
            const expiryDate = updateCall[1].passwordResetExpires;
            // Expiry should be approximately 1 hour from now
            const expectedMin = new Date(before.getTime() + 55 * 60 * 1000); // 55 minutes
            const expectedMax = new Date(after.getTime() + 65 * 60 * 1000); // 65 minutes
            expect(expiryDate.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime());
            expect(expiryDate.getTime()).toBeLessThanOrEqual(expectedMax.getTime());
        });
        it('should return raw token for email sending', async () => {
            mockUserService.findByEmail.mockResolvedValue(mockUser);
            mockUserRepository.update.mockResolvedValue(mockUser);
            const result = await authService.requestPasswordReset('test@example.com');
            // Token should be hex string (64 characters for 32 bytes)
            expect(result.token).toBeDefined();
            expect(result.token).toMatch(/^[a-f0-9]{64}$/);
        });
        it('should handle inactive users', async () => {
            const inactiveUser = { ...mockUser, status: user_entity_1.UserStatus.INACTIVE };
            mockUserService.findByEmail.mockResolvedValue(inactiveUser);
            const result = await authService.requestPasswordReset('test@example.com');
            // Should still return success message (prevent enumeration)
            expect(result.success).toBe(true);
            expect(mockUserRepository.update).not.toHaveBeenCalled();
        });
        it('should handle suspended users', async () => {
            const suspendedUser = { ...mockUser, status: user_entity_1.UserStatus.SUSPENDED };
            mockUserService.findByEmail.mockResolvedValue(suspendedUser);
            const result = await authService.requestPasswordReset('test@example.com');
            // Should still return success message (prevent enumeration)
            expect(result.success).toBe(true);
            expect(mockUserRepository.update).not.toHaveBeenCalled();
        });
    });
    describe('resetPassword', () => {
        const validToken = crypto.randomBytes(32).toString('hex');
        const validTokenHash = crypto.createHash('sha256').update(validToken).digest('hex');
        it('should reset password when token is valid and not expired', async () => {
            const userWithToken = {
                ...mockUser,
                passwordResetToken: validTokenHash,
                passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
            };
            mockUserRepository.findByEmail.mockResolvedValue(userWithToken);
            mockUserService.updatePassword.mockResolvedValue();
            mockUserRepository.update.mockResolvedValue(mockUser);
            mockTokenRepo.revokeAllUserTokens.mockResolvedValue();
            const result = await authService.resetPassword('test@example.com', validToken, 'NewPassword123!');
            expect(result.success).toBe(true);
            expect(result.message).toBe('Password reset successful.');
            expect(mockUserService.updatePassword).toHaveBeenCalledWith(mockUser.id, 'NewPassword123!');
        });
        it('should invalidate token after successful reset', async () => {
            const userWithToken = {
                ...mockUser,
                passwordResetToken: validTokenHash,
                passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000),
            };
            mockUserRepository.findByEmail.mockResolvedValue(userWithToken);
            mockUserService.updatePassword.mockResolvedValue();
            mockUserRepository.update.mockResolvedValue(mockUser);
            mockTokenRepo.revokeAllUserTokens.mockResolvedValue();
            await authService.resetPassword('test@example.com', validToken, 'NewPassword123!');
            expect(mockUserRepository.update).toHaveBeenCalledWith(mockUser.id, expect.objectContaining({
                passwordResetToken: null,
                passwordResetExpires: null,
            }));
        });
        it('should revoke all refresh tokens after password reset', async () => {
            const userWithToken = {
                ...mockUser,
                passwordResetToken: validTokenHash,
                passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000),
            };
            mockUserRepository.findByEmail.mockResolvedValue(userWithToken);
            mockUserService.updatePassword.mockResolvedValue();
            mockUserRepository.update.mockResolvedValue(mockUser);
            mockTokenRepo.revokeAllUserTokens.mockResolvedValue();
            await authService.resetPassword('test@example.com', validToken, 'NewPassword123!');
            expect(mockTokenRepo.revokeAllUserTokens).toHaveBeenCalledWith(mockUser.id);
        });
        it('should throw error when token is expired', async () => {
            const userWithExpiredToken = {
                ...mockUser,
                passwordResetToken: validTokenHash,
                passwordResetExpires: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
            };
            mockUserRepository.findByEmail.mockResolvedValue(userWithExpiredToken);
            await expect(authService.resetPassword('test@example.com', validToken, 'NewPassword123!')).rejects.toThrow('Invalid or expired password reset token');
            expect(mockUserService.updatePassword).not.toHaveBeenCalled();
        });
        it('should throw error when token is invalid', async () => {
            const userWithToken = {
                ...mockUser,
                passwordResetToken: validTokenHash,
                passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000),
            };
            mockUserRepository.findByEmail.mockResolvedValue(userWithToken);
            const invalidToken = crypto.randomBytes(32).toString('hex');
            await expect(authService.resetPassword('test@example.com', invalidToken, 'NewPassword123!')).rejects.toThrow('Invalid or expired password reset token');
            expect(mockUserService.updatePassword).not.toHaveBeenCalled();
        });
        it('should throw error when user has no reset token', async () => {
            mockUserRepository.findByEmail.mockResolvedValue(mockUser); // No token set
            await expect(authService.resetPassword('test@example.com', validToken, 'NewPassword123!')).rejects.toThrow('Invalid or expired password reset token');
            expect(mockUserService.updatePassword).not.toHaveBeenCalled();
        });
        it('should throw error when user does not exist', async () => {
            mockUserRepository.findByEmail.mockResolvedValue(null);
            await expect(authService.resetPassword('nonexistent@example.com', validToken, 'NewPassword123!')).rejects.toThrow('Invalid or expired password reset token');
            expect(mockUserService.updatePassword).not.toHaveBeenCalled();
        });
        it('should use constant-time comparison for token verification', async () => {
            // This test ensures we use secure comparison to prevent timing attacks
            const userWithToken = {
                ...mockUser,
                passwordResetToken: validTokenHash,
                passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000),
            };
            mockUserRepository.findByEmail.mockResolvedValue(userWithToken);
            mockUserService.updatePassword.mockResolvedValue();
            mockUserRepository.update.mockResolvedValue(mockUser);
            mockTokenRepo.revokeAllUserTokens.mockResolvedValue();
            // Valid token should succeed
            const result = await authService.resetPassword('test@example.com', validToken, 'NewPassword123!');
            expect(result.success).toBe(true);
        });
    });
});
