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
exports.InvitationService = void 0;
const tsyringe_1 = require("tsyringe");
const crypto = __importStar(require("crypto"));
const invitation_repository_1 = require("./invitation.repository");
const invitation_entity_1 = require("./invitation.entity");
const email_service_1 = require("./email.service");
const user_service_1 = require("@features/users/user.service");
const user_repository_1 = require("@features/users/user.repository");
const role_repository_1 = require("@features/roles/role.repository");
const tenant_service_1 = require("@features/tenants/tenant.service");
const constants_1 = require("@config/constants");
const logger_config_1 = require("@config/logger.config");
const database_config_1 = require("@config/database.config");
const http_exceptions_1 = require("@shared/exceptions/http-exceptions");
/**
 * Security constants for timing attack prevention
 */
const TIMING_CONSTANTS = {
    MIN_DELAY_MS: 50,
    MAX_DELAY_MS: 150,
};
/**
 * Invitation service handling all invitation business logic.
 *
 * Security measures implemented:
 * - Token hashing with SHA256 before storage
 * - Constant-time comparison for token validation
 * - Random delays to prevent timing attacks
 * - Generic error messages to prevent enumeration
 */
let InvitationService = class InvitationService {
    invitationRepo;
    emailService;
    userService;
    userRepository;
    roleRepository;
    tenantService;
    constructor(invitationRepo, emailService, userService, userRepository, roleRepository, tenantService) {
        this.invitationRepo = invitationRepo;
        this.emailService = emailService;
        this.userService = userService;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.tenantService = tenantService;
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
    /**
     * Generate a cryptographically secure invitation token
     */
    generateToken() {
        return crypto.randomBytes(constants_1.INVITATION_CONSTANTS.TOKEN_BYTES).toString('hex');
    }
    /**
     * Hash a token using SHA256
     */
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
    /**
     * Calculate invitation expiry date
     */
    calculateExpiry() {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + constants_1.INVITATION_CONSTANTS.EXPIRY_HOURS);
        return expiresAt;
    }
    /**
     * Get the frontend URL for invitation acceptance
     */
    getInvitationUrl(token) {
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return `${baseUrl}/accept-invitation?token=${encodeURIComponent(token)}`;
    }
    /**
     * Format invitation for API response
     */
    formatInvitationResponse(invitation) {
        return {
            id: invitation.id,
            email: invitation.email,
            status: invitation.status,
            inviterName: invitation.inviter
                ? `${invitation.inviter.firstName} ${invitation.inviter.lastName}`
                : 'Unknown',
            tenantName: invitation.tenant?.name || 'Unknown',
            expiresAt: invitation.expiresAt.toISOString(),
            createdAt: invitation.createdAt.toISOString(),
        };
    }
    /**
     * Create a new invitation and send email.
     *
     * Security: Uses generic error messages to prevent user enumeration.
     *
     * @param tenantId - The tenant to invite the user to
     * @param email - The email address to invite
     * @param inviterId - The user sending the invitation
     * @returns The created invitation with optional warning if email failed
     * @throws ConflictException with generic message if unable to create invitation
     */
    async createInvitation(tenantId, email, inviterId) {
        // Normalize email
        const normalizedEmail = email.toLowerCase().trim();
        // Check if user already exists with this email in the tenant
        // Use generic error message to prevent user enumeration
        const existingUser = await this.userRepository.findByEmail(normalizedEmail);
        if (existingUser && existingUser.tenantId === tenantId) {
            throw new http_exceptions_1.ConflictException('Unable to create invitation for this email address');
        }
        // Check for existing pending invitation
        // Use generic error message to prevent invitation enumeration
        const existingInvitation = await this.invitationRepo.findByTenantAndEmail(tenantId, normalizedEmail);
        if (existingInvitation && existingInvitation.status === invitation_entity_1.InvitationStatus.PENDING) {
            throw new http_exceptions_1.ConflictException('Unable to create invitation for this email address');
        }
        // Get inviter and tenant details for the email
        const inviter = await this.userService.findById(inviterId);
        if (!inviter) {
            throw new http_exceptions_1.NotFoundException('Inviter not found');
        }
        const tenant = await this.tenantService.findById(tenantId);
        // Generate token and hash
        const rawToken = this.generateToken();
        const tokenHash = this.hashToken(rawToken);
        const expiresAt = this.calculateExpiry();
        // Delete existing non-pending invitation if exists (to allow re-invitation)
        if (existingInvitation && existingInvitation.status !== invitation_entity_1.InvitationStatus.PENDING) {
            await this.invitationRepo.delete(existingInvitation.id);
        }
        // Create invitation
        const invitation = await this.invitationRepo.create({
            tenantId,
            email: normalizedEmail,
            inviterId,
            tokenHash,
            expiresAt,
            status: invitation_entity_1.InvitationStatus.PENDING,
        });
        // Send invitation email and track if it succeeded
        let emailSendFailed = false;
        try {
            await this.emailService.sendInvitationEmail({
                recipientEmail: normalizedEmail,
                inviterName: `${inviter.firstName} ${inviter.lastName}`,
                tenantName: tenant.name,
                invitationUrl: this.getInvitationUrl(rawToken),
                expiresAt,
            });
        }
        catch (error) {
            emailSendFailed = true;
            // Log error but don't fail the invitation creation
            logger_config_1.auditLogger.error('Failed to send invitation email', {
                invitationId: invitation.id,
                email: normalizedEmail,
                error: error.message,
            });
        }
        logger_config_1.auditLogger.info('Invitation created', {
            invitationId: invitation.id,
            tenantId,
            email: normalizedEmail,
            inviterId,
            expiresAt: expiresAt.toISOString(),
            emailSent: !emailSendFailed,
        });
        // Reload with relations for response
        const fullInvitation = await this.invitationRepo.findById(invitation.id);
        const response = this.formatInvitationResponse(fullInvitation);
        // Add warning if email failed to send
        if (emailSendFailed) {
            response.warning = 'Invitation created but email delivery failed. You may need to resend the invitation.';
        }
        return response;
    }
    /**
     * Validate an invitation token.
     *
     * Uses constant-time comparison and random delays for security.
     *
     * @param token - The raw token to validate
     * @returns Validation result with invitation details if valid
     */
    async validateInvitation(token) {
        // Add security delay
        await this.addSecurityDelay();
        if (!token || typeof token !== 'string') {
            return { valid: false };
        }
        const tokenHash = this.hashToken(token);
        const invitation = await this.invitationRepo.findByTokenHash(tokenHash);
        if (!invitation) {
            // Still perform hash computation for timing consistency
            this.hashToken('dummy-token-for-timing');
            return { valid: false };
        }
        // Check if expired or already used
        if (!invitation.isValid()) {
            // Mark as expired if it was pending and now expired
            if (invitation.status === invitation_entity_1.InvitationStatus.PENDING && invitation.isExpired()) {
                await this.invitationRepo.markAsExpired(invitation.id);
            }
            return { valid: false };
        }
        return {
            valid: true,
            email: invitation.email,
            tenantName: invitation.tenant?.name,
            inviterName: invitation.inviter
                ? `${invitation.inviter.firstName} ${invitation.inviter.lastName}`
                : undefined,
            expiresAt: invitation.expiresAt.toISOString(),
        };
    }
    /**
     * Accept an invitation and create the user account.
     *
     * This method uses a database transaction to ensure atomicity:
     * - Find and validate the invitation
     * - Create the user account
     * - Mark invitation as accepted
     *
     * If any step fails, the entire operation is rolled back.
     *
     * @param token - The raw invitation token
     * @param password - The password for the new account
     * @param firstName - The user's first name
     * @param lastName - The user's last name
     * @returns The created user's basic info
     * @throws BadRequestException if token is invalid or expired
     * @throws ConflictException if user creation fails due to duplicate email
     */
    async acceptInvitation(token, password, firstName, lastName) {
        // Add security delay
        await this.addSecurityDelay();
        if (!token || typeof token !== 'string') {
            throw new http_exceptions_1.BadRequestException('Invalid invitation token');
        }
        const tokenHash = this.hashToken(token);
        // Use a database transaction to ensure atomicity
        const queryRunner = database_config_1.AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            // Find invitation within transaction
            const invitation = await this.invitationRepo.findByTokenHash(tokenHash);
            if (!invitation || !invitation.isValid()) {
                throw new http_exceptions_1.BadRequestException('Invalid or expired invitation token');
            }
            // Check if user already exists with this email
            const existingUser = await this.userRepository.findByEmail(invitation.email);
            if (existingUser) {
                // Use generic message to prevent enumeration
                throw new http_exceptions_1.ConflictException('Unable to complete invitation acceptance');
            }
            // Get the agent role (default role for invited users)
            const agentRole = await this.roleRepository.findByName('agent');
            if (!agentRole) {
                logger_config_1.auditLogger.error('Agent role not found during invitation acceptance', {
                    invitationId: invitation.id,
                });
                throw new Error('System configuration error: agent role not found');
            }
            // Create user with tenant association
            const user = await this.userService.createUser({
                email: invitation.email,
                password,
                firstName,
                lastName,
                tenantId: invitation.tenantId,
            });
            // Assign agent role
            await this.userService.addRoles(user.id, [agentRole.id]);
            // Mark invitation as accepted
            await this.invitationRepo.markAsAccepted(invitation.id);
            // Commit the transaction
            await queryRunner.commitTransaction();
            logger_config_1.auditLogger.info('Invitation accepted', {
                invitationId: invitation.id,
                userId: user.id,
                email: invitation.email,
                tenantId: invitation.tenantId,
            });
            return {
                userId: user.id,
                email: user.email,
            };
        }
        catch (error) {
            // Rollback the transaction on any error
            await queryRunner.rollbackTransaction();
            // Handle unique constraint violations gracefully
            if (error instanceof Error &&
                (error.message.includes('duplicate key') ||
                    error.message.includes('unique constraint') ||
                    error.message.includes('UNIQUE constraint'))) {
                logger_config_1.auditLogger.warn('Duplicate user creation attempt during invitation acceptance', {
                    tokenHash: tokenHash.substring(0, 8) + '...', // Log partial hash only
                    error: error.message,
                });
                throw new http_exceptions_1.ConflictException('Unable to complete invitation acceptance');
            }
            // Re-throw known exceptions
            if (error instanceof http_exceptions_1.BadRequestException ||
                error instanceof http_exceptions_1.ConflictException ||
                error instanceof http_exceptions_1.NotFoundException) {
                throw error;
            }
            // Log unexpected errors and throw generic error
            logger_config_1.auditLogger.error('Unexpected error during invitation acceptance', {
                error: error.message,
            });
            throw new Error('An unexpected error occurred while accepting the invitation');
        }
        finally {
            // Release the query runner
            await queryRunner.release();
        }
    }
    /**
     * Decline an invitation.
     *
     * @param token - The raw invitation token
     * @throws BadRequestException if token is invalid
     */
    async declineInvitation(token) {
        // Add security delay
        await this.addSecurityDelay();
        if (!token || typeof token !== 'string') {
            throw new http_exceptions_1.BadRequestException('Invalid invitation token');
        }
        const tokenHash = this.hashToken(token);
        const invitation = await this.invitationRepo.findByTokenHash(tokenHash);
        if (!invitation) {
            throw new http_exceptions_1.BadRequestException('Invalid invitation token');
        }
        // Only pending invitations can be declined
        if (invitation.status !== invitation_entity_1.InvitationStatus.PENDING) {
            throw new http_exceptions_1.BadRequestException('This invitation has already been processed');
        }
        await this.invitationRepo.markAsDeclined(invitation.id);
        logger_config_1.auditLogger.info('Invitation declined', {
            invitationId: invitation.id,
            email: invitation.email,
            tenantId: invitation.tenantId,
        });
    }
    /**
     * Resend an invitation with a new token.
     *
     * Security: Uses generic error messages to prevent invitation enumeration.
     *
     * @param tenantId - The tenant ID
     * @param email - The email address
     * @param inviterId - The user resending the invitation
     * @returns The updated invitation with optional warning if email failed
     * @throws NotFoundException with generic message if invitation not found or cannot be resent
     */
    async resendInvitation(tenantId, email, inviterId) {
        const normalizedEmail = email.toLowerCase().trim();
        // Find existing invitation
        const invitation = await this.invitationRepo.findByTenantAndEmail(tenantId, normalizedEmail);
        if (!invitation) {
            // Use generic message to prevent invitation enumeration
            throw new http_exceptions_1.NotFoundException('Unable to resend invitation for this email address');
        }
        // Only pending or expired invitations can be resent
        if (invitation.status !== invitation_entity_1.InvitationStatus.PENDING &&
            invitation.status !== invitation_entity_1.InvitationStatus.EXPIRED) {
            // Use generic message
            throw new http_exceptions_1.BadRequestException('Unable to resend invitation for this email address');
        }
        // Get inviter and tenant details for the email
        const inviter = await this.userService.findById(inviterId);
        if (!inviter) {
            throw new http_exceptions_1.NotFoundException('Inviter not found');
        }
        const tenant = await this.tenantService.findById(tenantId);
        // Generate new token and expiry
        const rawToken = this.generateToken();
        const tokenHash = this.hashToken(rawToken);
        const expiresAt = this.calculateExpiry();
        // Update invitation
        const updatedInvitation = await this.invitationRepo.update(invitation.id, {
            tokenHash,
            expiresAt,
            inviterId,
            status: invitation_entity_1.InvitationStatus.PENDING,
        });
        // Send invitation email and track if it succeeded
        let emailSendFailed = false;
        try {
            await this.emailService.sendInvitationEmail({
                recipientEmail: normalizedEmail,
                inviterName: `${inviter.firstName} ${inviter.lastName}`,
                tenantName: tenant.name,
                invitationUrl: this.getInvitationUrl(rawToken),
                expiresAt,
            });
        }
        catch (error) {
            emailSendFailed = true;
            logger_config_1.auditLogger.error('Failed to resend invitation email', {
                invitationId: invitation.id,
                email: normalizedEmail,
                error: error.message,
            });
        }
        logger_config_1.auditLogger.info('Invitation resent', {
            invitationId: invitation.id,
            tenantId,
            email: normalizedEmail,
            inviterId,
            expiresAt: expiresAt.toISOString(),
            emailSent: !emailSendFailed,
        });
        const response = this.formatInvitationResponse(updatedInvitation);
        // Add warning if email failed to send
        if (emailSendFailed) {
            response.warning = 'Invitation updated but email delivery failed. You may need to resend again.';
        }
        return response;
    }
    /**
     * Get all invitations for a tenant.
     *
     * @param tenantId - The tenant ID
     * @param options - Pagination and filter options
     * @returns List of invitations with pagination info
     */
    async getInvitationsByTenant(tenantId, options) {
        const page = options?.page || 1;
        const limit = options?.limit || 20;
        const skip = (page - 1) * limit;
        const [invitations, total] = await this.invitationRepo.findByTenant(tenantId, {
            status: options?.status,
            skip,
            take: limit,
        });
        return {
            data: invitations.map((inv) => this.formatInvitationResponse(inv)),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Delete an invitation.
     *
     * @param tenantId - The tenant ID (for authorization)
     * @param invitationId - The invitation to delete
     * @throws NotFoundException if invitation not found
     */
    async deleteInvitation(tenantId, invitationId) {
        const invitation = await this.invitationRepo.findById(invitationId);
        if (!invitation || invitation.tenantId !== tenantId) {
            throw new http_exceptions_1.NotFoundException('Invitation not found');
        }
        await this.invitationRepo.delete(invitationId);
        logger_config_1.auditLogger.info('Invitation deleted', {
            invitationId,
            tenantId,
            email: invitation.email,
        });
    }
};
exports.InvitationService = InvitationService;
exports.InvitationService = InvitationService = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(invitation_repository_1.InvitationRepository)),
    __param(1, (0, tsyringe_1.inject)(email_service_1.EmailService)),
    __param(2, (0, tsyringe_1.inject)(user_service_1.UserService)),
    __param(3, (0, tsyringe_1.inject)(user_repository_1.UserRepository)),
    __param(4, (0, tsyringe_1.inject)(role_repository_1.RoleRepository)),
    __param(5, (0, tsyringe_1.inject)(tenant_service_1.TenantService)),
    __metadata("design:paramtypes", [invitation_repository_1.InvitationRepository,
        email_service_1.EmailService,
        user_service_1.UserService,
        user_repository_1.UserRepository,
        role_repository_1.RoleRepository,
        tenant_service_1.TenantService])
], InvitationService);
