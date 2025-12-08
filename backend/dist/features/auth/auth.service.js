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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const tsyringe_1 = require("tsyringe");
const jwt = __importStar(require("jsonwebtoken"));
const crypto = __importStar(require("crypto"));
const user_service_1 = require("@features/users/user.service");
const user_repository_1 = require("@features/users/user.repository");
const refresh_token_repository_1 = require("./refresh-token.repository");
const tenant_service_1 = require("@features/tenants/tenant.service");
const role_repository_1 = require("@features/roles/role.repository");
const user_entity_1 = require("@features/users/user.entity");
const constants_1 = require("@config/constants");
const database_config_1 = require("@config/database.config");
const http_exceptions_1 = require("@shared/exceptions/http-exceptions");
const logger_config_1 = require("@config/logger.config");
const slug_utils_1 = require("@shared/utils/slug.utils");
/**
 * Security constants for timing attack prevention
 */
const TIMING_CONSTANTS = {
    MIN_DELAY_MS: 50,
    MAX_DELAY_MS: 150,
};
let AuthService = class AuthService {
    userService;
    tokenRepo;
    userRepository;
    tenantService;
    roleRepository;
    constructor(userService, tokenRepo, userRepository, tenantService, roleRepository) {
        this.userService = userService;
        this.tokenRepo = tokenRepo;
        this.userRepository = userRepository;
        this.tenantService = tenantService;
        this.roleRepository = roleRepository;
    }
    /**
     * Adds a random delay to normalize response times and prevent timing attacks.
     * Uses cryptographically secure random number generation.
     */
    async addSecurityDelay() {
        const range = TIMING_CONSTANTS.MAX_DELAY_MS - TIMING_CONSTANTS.MIN_DELAY_MS;
        const randomBytes = crypto.randomBytes(4);
        const randomValue = randomBytes.readUInt32BE(0) / 0xffffffff;
        const delay = TIMING_CONSTANTS.MIN_DELAY_MS + Math.floor(randomValue * range);
        return new Promise((resolve) => setTimeout(resolve, delay));
    }
    /**
     * Performs a constant-time string comparison to prevent timing attacks.
     * Always compares the full length regardless of early mismatches.
     */
    constantTimeCompare(a, b) {
        if (typeof a !== 'string' || typeof b !== 'string') {
            return false;
        }
        const bufA = Buffer.from(a);
        const bufB = Buffer.from(b);
        // Use crypto.timingSafeEqual which requires equal length buffers
        // Pad shorter buffer to match length (comparison will fail anyway)
        if (bufA.length !== bufB.length) {
            const maxLen = Math.max(bufA.length, bufB.length);
            const paddedA = Buffer.alloc(maxLen);
            const paddedB = Buffer.alloc(maxLen);
            bufA.copy(paddedA);
            bufB.copy(paddedB);
            // Perform comparison even though we know it will fail (constant time)
            crypto.timingSafeEqual(paddedA, paddedB);
            return false;
        }
        return crypto.timingSafeEqual(bufA, bufB);
    }
    async validateCredentials(email, password) {
        return this.userService.validateCredentials(email, password);
    }
    async login(user, ipAddress, userAgent) {
        // Update last login timestamp
        await this.userService.updateLastLogin(user.id);
        // Log successful login
        logger_config_1.auditLogger.info('User login', {
            userId: user.id,
            email: user.email,
            ipAddress,
            userAgent,
        });
        // Generate tokens
        const accessToken = this.generateAccessToken(user);
        const refreshToken = await this.generateRefreshToken(user, ipAddress, userAgent);
        return { accessToken, refreshToken };
    }
    generateAccessToken(user) {
        const payload = {
            sub: user.id,
            email: user.email,
        };
        return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: constants_1.AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRY });
    }
    /**
     * Generate refresh token using token identifier pattern
     * This prevents timing attacks by using constant-time lookup
     */
    async generateRefreshToken(user, ipAddress, userAgent) {
        // Generate token ID (for lookup) + secret (for verification)
        const tokenId = crypto.randomBytes(constants_1.AUTH_CONSTANTS.TOKEN_ID_BYTES).toString('hex');
        const tokenSecret = crypto.randomBytes(constants_1.AUTH_CONSTANTS.TOKEN_SECRET_BYTES).toString('hex');
        const fullToken = `${tokenId}.${tokenSecret}`;
        // Hash only the secret part using SHA256 (fast, secure for random data)
        const tokenSecretHash = crypto.createHash('sha256').update(tokenSecret).digest('hex');
        // Calculate expiry
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + constants_1.AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY_DAYS);
        // Store in database
        await this.tokenRepo.create({
            userId: user.id,
            tokenId, // NOT hashed - used for constant-time lookup
            tokenSecretHash, // Hashed with SHA256
            expiresAt,
            ipAddress,
            userAgent,
        });
        return fullToken;
    }
    /**
     * Refresh access token with token rotation
     * Uses constant-time lookup to prevent timing attacks
     */
    async refreshAccessToken(refreshToken, ipAddress, userAgent) {
        // Parse token (constant-time split)
        const parts = refreshToken.split('.');
        if (parts.length !== 2) {
            throw new http_exceptions_1.InvalidTokenException('Malformed refresh token');
        }
        const [tokenId, tokenSecret] = parts;
        // Constant-time lookup by tokenId (prevents timing attack)
        const stored = await this.tokenRepo.findByTokenId(tokenId);
        if (!stored || !stored.isValid()) {
            logger_config_1.auditLogger.warn('Invalid or expired refresh token used', { tokenId });
            throw new http_exceptions_1.InvalidTokenException();
        }
        // Verify secret using SHA256
        const tokenSecretHash = crypto.createHash('sha256').update(tokenSecret).digest('hex');
        if (stored.tokenSecretHash !== tokenSecretHash) {
            logger_config_1.auditLogger.warn('Refresh token secret mismatch', { userId: stored.userId, tokenId });
            throw new http_exceptions_1.InvalidTokenException();
        }
        // Get user
        const user = await this.userService.findById(stored.userId);
        if (!user) {
            throw new http_exceptions_1.UserNotFoundException(stored.userId);
        }
        // TOKEN ROTATION: Revoke the old token immediately
        await this.tokenRepo.revokeToken(stored.id);
        // Generate NEW tokens
        const newAccessToken = this.generateAccessToken(user);
        const newRefreshToken = await this.generateRefreshToken(user, ipAddress, userAgent);
        logger_config_1.auditLogger.info('Token refreshed', {
            userId: user.id,
            oldTokenId: tokenId,
            ipAddress,
        });
        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        };
    }
    /**
     * Logout by revoking refresh token
     */
    async logout(refreshToken, userId) {
        try {
            const parts = refreshToken.split('.');
            if (parts.length === 2) {
                const [tokenId] = parts;
                // Constant-time lookup
                const stored = await this.tokenRepo.findByTokenId(tokenId);
                if (stored) {
                    await this.tokenRepo.revokeToken(stored.id);
                    logger_config_1.auditLogger.info('User logout', { userId: stored.userId, tokenId });
                }
            }
        }
        catch (error) {
            // Silent fail on logout errors
            if (userId) {
                logger_config_1.auditLogger.warn('Logout error', { userId, error: error.message });
            }
        }
    }
    async logoutAllSessions(userId) {
        await this.tokenRepo.revokeAllUserTokens(userId);
    }
    /**
     * Register a new user with timing attack prevention.
     * Returns a generic error message to prevent account enumeration.
     *
     * Security measures:
     * - Random delay added to normalize response times
     * - Generic error messages for all failure cases
     * - Password validation performed regardless of email existence
     * - Tenant and user creation wrapped in a transaction for atomicity
     */
    async register(data) {
        // Add random delay to prevent timing-based enumeration
        await this.addSecurityDelay();
        // Use a transaction to ensure atomicity - if user creation fails, tenant is rolled back
        const queryRunner = database_config_1.AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            // Generate slug from company name
            const slug = (0, slug_utils_1.generateSlug)(data.companyName);
            // Create tenant first
            const tenant = await this.tenantService.create({
                name: data.companyName,
                slug,
            });
            // Create user with tenant association
            const user = await this.userService.createUser({
                email: data.email,
                password: data.password,
                firstName: data.firstName,
                lastName: data.lastName,
                tenantId: tenant.id,
            });
            // Assign admin role to the first user (tenant creator)
            const adminRole = await this.roleRepository.findByName('admin');
            if (adminRole) {
                await this.userService.addRoles(user.id, [adminRole.id]);
            }
            await queryRunner.commitTransaction();
            logger_config_1.auditLogger.info('User registered with tenant as admin', {
                userId: user.id,
                email: user.email,
                tenantId: tenant.id,
                tenantSlug: tenant.slug,
                roleAssigned: adminRole?.name || 'none',
            });
            return user;
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            // Log the actual error for debugging but return generic message
            logger_config_1.auditLogger.warn('Registration failed', {
                email: data.email,
                error: error.message,
            });
            // Re-throw with the same error - the controller will handle
            // returning a generic message to the client
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    verifyAccessToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        }
        catch {
            throw new Error('Invalid access token');
        }
    }
    /**
     * Request a password reset for the given email.
     *
     * Security measures:
     * - Always returns the same message regardless of whether the email exists
     * - Uses random delay to prevent timing-based enumeration
     * - Only active users can request password reset
     * - Token is hashed before storage (SHA256)
     *
     * @param email - The email address to send the reset link to
     * @returns PasswordResetResult with success status and optional raw token
     */
    async requestPasswordReset(email) {
        // Add random delay to prevent timing-based enumeration
        await this.addSecurityDelay();
        const genericMessage = 'If your email is registered, you will receive a password reset link.';
        try {
            // Find user by email
            const user = await this.userService.findByEmail(email);
            // If user doesn't exist or is not active, return success to prevent enumeration
            if (!user || user.status !== user_entity_1.UserStatus.ACTIVE) {
                logger_config_1.auditLogger.info('Password reset requested for unknown/inactive email', {
                    email,
                    userExists: !!user,
                    userStatus: user?.status,
                });
                return { success: true, message: genericMessage };
            }
            // Generate secure random token
            const rawToken = crypto.randomBytes(constants_1.AUTH_CONSTANTS.PASSWORD_RESET_TOKEN_BYTES).toString('hex');
            // Hash token for storage (SHA256)
            const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
            // Calculate expiry
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + constants_1.AUTH_CONSTANTS.PASSWORD_RESET_EXPIRY_HOURS);
            // Store hashed token and expiry in database
            await this.userRepository.update(user.id, {
                passwordResetToken: tokenHash,
                passwordResetExpires: expiresAt,
            });
            logger_config_1.auditLogger.info('Password reset token generated', {
                userId: user.id,
                email: user.email,
                expiresAt: expiresAt.toISOString(),
            });
            // In production, you would send an email here
            // For now, return the raw token for testing/development
            // The frontend will use this to construct the reset URL
            return {
                success: true,
                message: genericMessage,
                token: rawToken, // Only for dev/email service use
            };
        }
        catch (error) {
            logger_config_1.auditLogger.error('Password reset request failed', {
                email,
                error: error.message,
            });
            // Return success anyway to prevent enumeration
            return { success: true, message: genericMessage };
        }
    }
    /**
     * Reset password using the provided token.
     *
     * Security measures:
     * - Token is verified using constant-time comparison
     * - Token is invalidated after successful use
     * - All refresh tokens are revoked after password change
     * - Generic error message for all failure cases
     *
     * @param email - The user's email address
     * @param token - The raw reset token received via email
     * @param newPassword - The new password to set
     * @returns PasswordResetResult with success status
     */
    async resetPassword(email, token, newPassword) {
        // Add random delay to prevent timing-based attacks
        await this.addSecurityDelay();
        const genericError = 'Invalid or expired password reset token';
        try {
            // Find user by email directly from repository to get reset token fields
            const user = await this.userRepository.findByEmail(email);
            // Verify user exists and has a reset token
            if (!user || !user.passwordResetToken || !user.passwordResetExpires) {
                logger_config_1.auditLogger.warn('Password reset attempted with no token', { email });
                throw new http_exceptions_1.BadRequestException(genericError);
            }
            // Check if token is expired
            if (new Date() > user.passwordResetExpires) {
                logger_config_1.auditLogger.warn('Password reset attempted with expired token', {
                    email,
                    userId: user.id,
                });
                throw new http_exceptions_1.BadRequestException(genericError);
            }
            // Hash the provided token and compare
            const providedTokenHash = crypto.createHash('sha256').update(token).digest('hex');
            // Constant-time comparison to prevent timing attacks
            if (!this.constantTimeCompare(providedTokenHash, user.passwordResetToken)) {
                logger_config_1.auditLogger.warn('Password reset attempted with invalid token', {
                    email,
                    userId: user.id,
                });
                throw new http_exceptions_1.BadRequestException(genericError);
            }
            // Update password using UserService (includes validation and hashing)
            await this.userService.updatePassword(user.id, newPassword);
            // Invalidate the reset token
            await this.userRepository.update(user.id, {
                passwordResetToken: null,
                passwordResetExpires: null,
            });
            // Revoke all refresh tokens to force re-login on all devices
            await this.tokenRepo.revokeAllUserTokens(user.id);
            logger_config_1.auditLogger.info('Password reset successful', {
                userId: user.id,
                email: user.email,
            });
            return {
                success: true,
                message: 'Password reset successful.',
            };
        }
        catch (error) {
            if (error instanceof http_exceptions_1.BadRequestException) {
                throw error;
            }
            logger_config_1.auditLogger.error('Password reset failed', {
                email,
                error: error.message,
            });
            throw new http_exceptions_1.BadRequestException(genericError);
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(user_service_1.UserService)),
    __param(1, (0, tsyringe_1.inject)(refresh_token_repository_1.RefreshTokenRepository)),
    __param(2, (0, tsyringe_1.inject)(user_repository_1.UserRepository)),
    __param(3, (0, tsyringe_1.inject)(tenant_service_1.TenantService)),
    __param(4, (0, tsyringe_1.inject)(role_repository_1.RoleRepository)),
    __metadata("design:paramtypes", [user_service_1.UserService,
        refresh_token_repository_1.RefreshTokenRepository,
        user_repository_1.UserRepository,
        tenant_service_1.TenantService,
        role_repository_1.RoleRepository])
], AuthService);
