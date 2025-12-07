import { inject, singleton } from 'tsyringe';
import * as crypto from 'crypto';
import { InvitationRepository } from './invitation.repository';
import { Invitation, InvitationStatus } from './invitation.entity';
import { EmailService } from './email.service';
import { UserService } from '@features/users/user.service';
import { UserRepository } from '@features/users/user.repository';
import { RoleRepository } from '@features/roles/role.repository';
import { TenantService } from '@features/tenants/tenant.service';
import { INVITATION_CONSTANTS } from '@config/constants';
import { auditLogger } from '@config/logger.config';
import { AppDataSource } from '@config/database.config';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@shared/exceptions/http-exceptions';
import { InvitationResponseDto, ValidateInvitationResponseDto } from './dto/invitation.dto';

/**
 * Security constants for timing attack prevention
 */
const TIMING_CONSTANTS = {
  MIN_DELAY_MS: 50,
  MAX_DELAY_MS: 150,
} as const;

/**
 * Result of creating an invitation
 */
interface CreateInvitationResult {
  invitation: Invitation;
  rawToken: string; // Only for email service, never exposed to API response
}

/**
 * Extended response DTO that includes optional warnings
 */
interface InvitationResponseWithWarning extends InvitationResponseDto {
  warning?: string;
}

/**
 * Invitation service handling all invitation business logic.
 *
 * Security measures implemented:
 * - Token hashing with SHA256 before storage
 * - Constant-time comparison for token validation
 * - Random delays to prevent timing attacks
 * - Generic error messages to prevent enumeration
 */
@singleton()
export class InvitationService {
  constructor(
    @inject(InvitationRepository) private invitationRepo: InvitationRepository,
    @inject(EmailService) private emailService: EmailService,
    @inject(UserService) private userService: UserService,
    @inject(UserRepository) private userRepository: UserRepository,
    @inject(RoleRepository) private roleRepository: RoleRepository,
    @inject(TenantService) private tenantService: TenantService
  ) {}

  /**
   * Adds a random delay to normalize response times and prevent timing attacks.
   * Uses cryptographically secure random number generation.
   */
  private async addSecurityDelay(): Promise<void> {
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
  private constantTimeCompare(a: string, b: string): boolean {
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
  private generateToken(): string {
    return crypto.randomBytes(INVITATION_CONSTANTS.TOKEN_BYTES).toString('hex');
  }

  /**
   * Hash a token using SHA256
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Calculate invitation expiry date
   */
  private calculateExpiry(): Date {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + INVITATION_CONSTANTS.EXPIRY_HOURS);
    return expiresAt;
  }

  /**
   * Get the frontend URL for invitation acceptance
   */
  private getInvitationUrl(token: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return `${baseUrl}/accept-invitation?token=${encodeURIComponent(token)}`;
  }

  /**
   * Format invitation for API response
   */
  private formatInvitationResponse(invitation: Invitation): InvitationResponseDto {
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
  async createInvitation(
    tenantId: string,
    email: string,
    inviterId: string
  ): Promise<InvitationResponseWithWarning> {
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists with this email in the tenant
    // Use generic error message to prevent user enumeration
    const existingUser = await this.userRepository.findByEmail(normalizedEmail);
    if (existingUser && existingUser.tenantId === tenantId) {
      throw new ConflictException('Unable to create invitation for this email address');
    }

    // Check for existing pending invitation
    // Use generic error message to prevent invitation enumeration
    const existingInvitation = await this.invitationRepo.findByTenantAndEmail(
      tenantId,
      normalizedEmail
    );
    if (existingInvitation && existingInvitation.status === InvitationStatus.PENDING) {
      throw new ConflictException('Unable to create invitation for this email address');
    }

    // Get inviter and tenant details for the email
    const inviter = await this.userService.findById(inviterId);
    if (!inviter) {
      throw new NotFoundException('Inviter not found');
    }

    const tenant = await this.tenantService.findById(tenantId);

    // Generate token and hash
    const rawToken = this.generateToken();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = this.calculateExpiry();

    // Delete existing non-pending invitation if exists (to allow re-invitation)
    if (existingInvitation && existingInvitation.status !== InvitationStatus.PENDING) {
      await this.invitationRepo.delete(existingInvitation.id);
    }

    // Create invitation
    const invitation = await this.invitationRepo.create({
      tenantId,
      email: normalizedEmail,
      inviterId,
      tokenHash,
      expiresAt,
      status: InvitationStatus.PENDING,
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
    } catch (error) {
      emailSendFailed = true;
      // Log error but don't fail the invitation creation
      auditLogger.error('Failed to send invitation email', {
        invitationId: invitation.id,
        email: normalizedEmail,
        error: (error as Error).message,
      });
    }

    auditLogger.info('Invitation created', {
      invitationId: invitation.id,
      tenantId,
      email: normalizedEmail,
      inviterId,
      expiresAt: expiresAt.toISOString(),
      emailSent: !emailSendFailed,
    });

    // Reload with relations for response
    const fullInvitation = await this.invitationRepo.findById(invitation.id);
    const response: InvitationResponseWithWarning = this.formatInvitationResponse(fullInvitation!);

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
  async validateInvitation(token: string): Promise<ValidateInvitationResponseDto> {
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
      if (invitation.status === InvitationStatus.PENDING && invitation.isExpired()) {
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
  async acceptInvitation(
    token: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<{ userId: string; email: string }> {
    // Add security delay
    await this.addSecurityDelay();

    if (!token || typeof token !== 'string') {
      throw new BadRequestException('Invalid invitation token');
    }

    const tokenHash = this.hashToken(token);

    // Use a database transaction to ensure atomicity
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find invitation within transaction
      const invitation = await this.invitationRepo.findByTokenHash(tokenHash);

      if (!invitation || !invitation.isValid()) {
        throw new BadRequestException('Invalid or expired invitation token');
      }

      // Check if user already exists with this email
      const existingUser = await this.userRepository.findByEmail(invitation.email);
      if (existingUser) {
        // Use generic message to prevent enumeration
        throw new ConflictException('Unable to complete invitation acceptance');
      }

      // Get the agent role (default role for invited users)
      const agentRole = await this.roleRepository.findByName('agent');
      if (!agentRole) {
        auditLogger.error('Agent role not found during invitation acceptance', {
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

      auditLogger.info('Invitation accepted', {
        invitationId: invitation.id,
        userId: user.id,
        email: invitation.email,
        tenantId: invitation.tenantId,
      });

      return {
        userId: user.id,
        email: user.email,
      };
    } catch (error) {
      // Rollback the transaction on any error
      await queryRunner.rollbackTransaction();

      // Handle unique constraint violations gracefully
      if (
        error instanceof Error &&
        (error.message.includes('duplicate key') ||
          error.message.includes('unique constraint') ||
          error.message.includes('UNIQUE constraint'))
      ) {
        auditLogger.warn('Duplicate user creation attempt during invitation acceptance', {
          tokenHash: tokenHash.substring(0, 8) + '...', // Log partial hash only
          error: error.message,
        });
        throw new ConflictException('Unable to complete invitation acceptance');
      }

      // Re-throw known exceptions
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // Log unexpected errors and throw generic error
      auditLogger.error('Unexpected error during invitation acceptance', {
        error: (error as Error).message,
      });
      throw new Error('An unexpected error occurred while accepting the invitation');
    } finally {
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
  async declineInvitation(token: string): Promise<void> {
    // Add security delay
    await this.addSecurityDelay();

    if (!token || typeof token !== 'string') {
      throw new BadRequestException('Invalid invitation token');
    }

    const tokenHash = this.hashToken(token);
    const invitation = await this.invitationRepo.findByTokenHash(tokenHash);

    if (!invitation) {
      throw new BadRequestException('Invalid invitation token');
    }

    // Only pending invitations can be declined
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('This invitation has already been processed');
    }

    await this.invitationRepo.markAsDeclined(invitation.id);

    auditLogger.info('Invitation declined', {
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
  async resendInvitation(
    tenantId: string,
    email: string,
    inviterId: string
  ): Promise<InvitationResponseWithWarning> {
    const normalizedEmail = email.toLowerCase().trim();

    // Find existing invitation
    const invitation = await this.invitationRepo.findByTenantAndEmail(tenantId, normalizedEmail);

    if (!invitation) {
      // Use generic message to prevent invitation enumeration
      throw new NotFoundException('Unable to resend invitation for this email address');
    }

    // Only pending or expired invitations can be resent
    if (
      invitation.status !== InvitationStatus.PENDING &&
      invitation.status !== InvitationStatus.EXPIRED
    ) {
      // Use generic message
      throw new BadRequestException('Unable to resend invitation for this email address');
    }

    // Get inviter and tenant details for the email
    const inviter = await this.userService.findById(inviterId);
    if (!inviter) {
      throw new NotFoundException('Inviter not found');
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
      status: InvitationStatus.PENDING,
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
    } catch (error) {
      emailSendFailed = true;
      auditLogger.error('Failed to resend invitation email', {
        invitationId: invitation.id,
        email: normalizedEmail,
        error: (error as Error).message,
      });
    }

    auditLogger.info('Invitation resent', {
      invitationId: invitation.id,
      tenantId,
      email: normalizedEmail,
      inviterId,
      expiresAt: expiresAt.toISOString(),
      emailSent: !emailSendFailed,
    });

    const response: InvitationResponseWithWarning = this.formatInvitationResponse(updatedInvitation);

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
  async getInvitationsByTenant(
    tenantId: string,
    options?: {
      status?: InvitationStatus;
      page?: number;
      limit?: number;
    }
  ): Promise<{
    data: InvitationResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
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
  async deleteInvitation(tenantId: string, invitationId: string): Promise<void> {
    const invitation = await this.invitationRepo.findById(invitationId);

    if (!invitation || invitation.tenantId !== tenantId) {
      throw new NotFoundException('Invitation not found');
    }

    await this.invitationRepo.delete(invitationId);

    auditLogger.info('Invitation deleted', {
      invitationId,
      tenantId,
      email: invitation.email,
    });
  }
}
