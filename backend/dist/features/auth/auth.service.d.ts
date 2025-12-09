import { UserService } from '../users/user.service';
import { UserRepository } from '../users/user.repository';
import { RefreshTokenRepository } from './refresh-token.repository';
import { TenantService } from '../tenants/tenant.service';
import { RoleRepository } from '../roles/role.repository';
import { User } from '../users/user.entity';
interface TokenPair {
    accessToken: string;
    refreshToken: string;
}
interface JwtPayload {
    sub: string;
    email: string;
    iat?: number;
    exp?: number;
}
interface PasswordResetResult {
    success: boolean;
    message: string;
    token?: string;
}
export declare class AuthService {
    private userService;
    private tokenRepo;
    private userRepository;
    private tenantService;
    private roleRepository;
    constructor(userService: UserService, tokenRepo: RefreshTokenRepository, userRepository: UserRepository, tenantService: TenantService, roleRepository: RoleRepository);
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
    validateCredentials(email: string, password: string): Promise<User | null>;
    login(user: User, ipAddress: string, userAgent: string): Promise<TokenPair>;
    private generateAccessToken;
    /**
     * Generate refresh token using token identifier pattern
     * This prevents timing attacks by using constant-time lookup
     */
    private generateRefreshToken;
    /**
     * Refresh access token with token rotation
     * Uses constant-time lookup to prevent timing attacks
     */
    refreshAccessToken(refreshToken: string, ipAddress: string, userAgent: string): Promise<TokenPair>;
    /**
     * Logout by revoking refresh token
     */
    logout(refreshToken: string, userId?: string): Promise<void>;
    logoutAllSessions(userId: string): Promise<void>;
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
    register(data: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        companyName: string;
    }): Promise<User>;
    verifyAccessToken(token: string): JwtPayload;
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
    requestPasswordReset(email: string): Promise<PasswordResetResult>;
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
    resetPassword(email: string, token: string, newPassword: string): Promise<PasswordResetResult>;
}
export {};
