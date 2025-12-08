import { InvitationRepository } from './invitation.repository';
import { InvitationStatus } from './invitation.entity';
import { EmailService } from './email.service';
import { UserService } from '@features/users/user.service';
import { UserRepository } from '@features/users/user.repository';
import { RoleRepository } from '@features/roles/role.repository';
import { TenantService } from '@features/tenants/tenant.service';
import { InvitationResponseDto, ValidateInvitationResponseDto } from './dto/invitation.dto';
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
export declare class InvitationService {
    private invitationRepo;
    private emailService;
    private userService;
    private userRepository;
    private roleRepository;
    private tenantService;
    constructor(invitationRepo: InvitationRepository, emailService: EmailService, userService: UserService, userRepository: UserRepository, roleRepository: RoleRepository, tenantService: TenantService);
    /**
     * Adds a random delay to normalize response times and prevent timing attacks.
     * Uses cryptographically secure random number generation.
     */
    private addSecurityDelay;
    /**
     * Performs a constant-time string comparison to prevent timing attacks.
     * Always compares the full length regardless of early mismatches.
     */
    private constantTimeCompare;
    /**
     * Generate a cryptographically secure invitation token
     */
    private generateToken;
    /**
     * Hash a token using SHA256
     */
    private hashToken;
    /**
     * Calculate invitation expiry date
     */
    private calculateExpiry;
    /**
     * Get the frontend URL for invitation acceptance
     */
    private getInvitationUrl;
    /**
     * Format invitation for API response
     */
    private formatInvitationResponse;
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
    createInvitation(tenantId: string, email: string, inviterId: string): Promise<InvitationResponseWithWarning>;
    /**
     * Validate an invitation token.
     *
     * Uses constant-time comparison and random delays for security.
     *
     * @param token - The raw token to validate
     * @returns Validation result with invitation details if valid
     */
    validateInvitation(token: string): Promise<ValidateInvitationResponseDto>;
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
    acceptInvitation(token: string, password: string, firstName: string, lastName: string): Promise<{
        userId: string;
        email: string;
    }>;
    /**
     * Decline an invitation.
     *
     * @param token - The raw invitation token
     * @throws BadRequestException if token is invalid
     */
    declineInvitation(token: string): Promise<void>;
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
    resendInvitation(tenantId: string, email: string, inviterId: string): Promise<InvitationResponseWithWarning>;
    /**
     * Get all invitations for a tenant.
     *
     * @param tenantId - The tenant ID
     * @param options - Pagination and filter options
     * @returns List of invitations with pagination info
     */
    getInvitationsByTenant(tenantId: string, options?: {
        status?: InvitationStatus;
        page?: number;
        limit?: number;
    }): Promise<{
        data: InvitationResponseDto[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    /**
     * Delete an invitation.
     *
     * @param tenantId - The tenant ID (for authorization)
     * @param invitationId - The invitation to delete
     * @throws NotFoundException if invitation not found
     */
    deleteInvitation(tenantId: string, invitationId: string): Promise<void>;
}
export {};
