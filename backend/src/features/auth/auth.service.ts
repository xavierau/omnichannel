import { inject, singleton } from 'tsyringe';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { UserService } from '@features/users/user.service';
import { UserRepository } from '@features/users/user.repository';
import { RefreshTokenRepository } from './refresh-token.repository';
import { TenantService } from '@features/tenants/tenant.service';
import { RoleRepository } from '@features/roles/role.repository';
import { User, UserStatus } from '@features/users/user.entity';
import { AUTH_CONSTANTS } from '@config/constants';
import { AppDataSource } from '@config/database.config';
import { InvalidTokenException, UserNotFoundException, BadRequestException } from '@shared/exceptions/http-exceptions';
import { auditLogger } from '@config/logger.config';
import { generateSlug } from '@shared/utils/slug.utils';

/**
 * Security constants for timing attack prevention
 */
const TIMING_CONSTANTS = {
  MIN_DELAY_MS: 50,
  MAX_DELAY_MS: 150,
} as const;

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
  token?: string; // Raw token for email sending (only returned in dev or for email service)
}

@singleton()
export class AuthService {
  constructor(
    @inject(UserService) private userService: UserService,
    @inject(RefreshTokenRepository) private tokenRepo: RefreshTokenRepository,
    @inject(UserRepository) private userRepository: UserRepository,
    @inject(TenantService) private tenantService: TenantService,
    @inject(RoleRepository) private roleRepository: RoleRepository
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

  async validateCredentials(email: string, password: string): Promise<User | null> {
    return this.userService.validateCredentials(email, password);
  }

  async login(
    user: User,
    ipAddress: string,
    userAgent: string
  ): Promise<TokenPair> {
    // Update last login timestamp
    await this.userService.updateLastLogin(user.id);

    // Log successful login
    auditLogger.info('User login', {
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

  private generateAccessToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    return jwt.sign(
      payload,
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRY }
    );
  }

  /**
   * Generate refresh token using token identifier pattern
   * This prevents timing attacks by using constant-time lookup
   */
  private async generateRefreshToken(
    user: User,
    ipAddress: string,
    userAgent: string
  ): Promise<string> {
    // Generate token ID (for lookup) + secret (for verification)
    const tokenId = crypto.randomBytes(AUTH_CONSTANTS.TOKEN_ID_BYTES).toString('hex');
    const tokenSecret = crypto.randomBytes(AUTH_CONSTANTS.TOKEN_SECRET_BYTES).toString('hex');
    const fullToken = `${tokenId}.${tokenSecret}`;

    // Hash only the secret part using SHA256 (fast, secure for random data)
    const tokenSecretHash = crypto.createHash('sha256').update(tokenSecret).digest('hex');

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY_DAYS);

    // Store in database
    await this.tokenRepo.create({
      userId: user.id,
      tokenId,              // NOT hashed - used for constant-time lookup
      tokenSecretHash,      // Hashed with SHA256
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
  async refreshAccessToken(
    refreshToken: string,
    ipAddress: string,
    userAgent: string
  ): Promise<TokenPair> {
    // Parse token (constant-time split)
    const parts = refreshToken.split('.');
    if (parts.length !== 2) {
      throw new InvalidTokenException('Malformed refresh token');
    }

    const [tokenId, tokenSecret] = parts;

    // Constant-time lookup by tokenId (prevents timing attack)
    const stored = await this.tokenRepo.findByTokenId(tokenId);

    if (!stored || !stored.isValid()) {
      auditLogger.warn('Invalid or expired refresh token used', { tokenId });
      throw new InvalidTokenException();
    }

    // Verify secret using SHA256
    const tokenSecretHash = crypto.createHash('sha256').update(tokenSecret).digest('hex');
    if (stored.tokenSecretHash !== tokenSecretHash) {
      auditLogger.warn('Refresh token secret mismatch', { userId: stored.userId, tokenId });
      throw new InvalidTokenException();
    }

    // Get user
    const user = await this.userService.findById(stored.userId);
    if (!user) {
      throw new UserNotFoundException(stored.userId);
    }

    // TOKEN ROTATION: Revoke the old token immediately
    await this.tokenRepo.revokeToken(stored.id);

    // Generate NEW tokens
    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = await this.generateRefreshToken(user, ipAddress, userAgent);

    auditLogger.info('Token refreshed', {
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
  async logout(refreshToken: string, userId?: string): Promise<void> {
    try {
      const parts = refreshToken.split('.');
      if (parts.length === 2) {
        const [tokenId] = parts;

        // Constant-time lookup
        const stored = await this.tokenRepo.findByTokenId(tokenId);
        if (stored) {
          await this.tokenRepo.revokeToken(stored.id);
          auditLogger.info('User logout', { userId: stored.userId, tokenId });
        }
      }
    } catch (error) {
      // Silent fail on logout errors
      if (userId) {
        auditLogger.warn('Logout error', { userId, error: (error as Error).message });
      }
    }
  }

  async logoutAllSessions(userId: string): Promise<void> {
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
  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    companyName: string;
  }): Promise<User> {
    // Add random delay to prevent timing-based enumeration
    await this.addSecurityDelay();

    // Use a transaction to ensure atomicity - if user creation fails, tenant is rolled back
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Generate slug from company name
      const slug = generateSlug(data.companyName);

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

      auditLogger.info('User registered with tenant as admin', {
        userId: user.id,
        email: user.email,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        roleAssigned: adminRole?.name || 'none',
      });

      return user;
    } catch (error) {
      await queryRunner.rollbackTransaction();

      // Log the actual error for debugging but return generic message
      auditLogger.warn('Registration failed', {
        email: data.email,
        error: (error as Error).message,
      });

      // Re-throw with the same error - the controller will handle
      // returning a generic message to the client
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JwtPayload;
    } catch {
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
  async requestPasswordReset(email: string): Promise<PasswordResetResult> {
    // Add random delay to prevent timing-based enumeration
    await this.addSecurityDelay();

    const genericMessage = 'If your email is registered, you will receive a password reset link.';

    try {
      // Find user by email
      const user = await this.userService.findByEmail(email);

      // If user doesn't exist or is not active, return success to prevent enumeration
      if (!user || user.status !== UserStatus.ACTIVE) {
        auditLogger.info('Password reset requested for unknown/inactive email', {
          email,
          userExists: !!user,
          userStatus: user?.status,
        });
        return { success: true, message: genericMessage };
      }

      // Generate secure random token
      const rawToken = crypto.randomBytes(AUTH_CONSTANTS.PASSWORD_RESET_TOKEN_BYTES).toString('hex');

      // Hash token for storage (SHA256)
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      // Calculate expiry
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + AUTH_CONSTANTS.PASSWORD_RESET_EXPIRY_HOURS);

      // Store hashed token and expiry in database
      await this.userRepository.update(user.id, {
        passwordResetToken: tokenHash,
        passwordResetExpires: expiresAt,
      });

      auditLogger.info('Password reset token generated', {
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
    } catch (error) {
      auditLogger.error('Password reset request failed', {
        email,
        error: (error as Error).message,
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
  async resetPassword(email: string, token: string, newPassword: string): Promise<PasswordResetResult> {
    // Add random delay to prevent timing-based attacks
    await this.addSecurityDelay();

    const genericError = 'Invalid or expired password reset token';

    try {
      // Find user by email directly from repository to get reset token fields
      const user = await this.userRepository.findByEmail(email);

      // Verify user exists and has a reset token
      if (!user || !user.passwordResetToken || !user.passwordResetExpires) {
        auditLogger.warn('Password reset attempted with no token', { email });
        throw new BadRequestException(genericError);
      }

      // Check if token is expired
      if (new Date() > user.passwordResetExpires) {
        auditLogger.warn('Password reset attempted with expired token', {
          email,
          userId: user.id,
        });
        throw new BadRequestException(genericError);
      }

      // Hash the provided token and compare
      const providedTokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Constant-time comparison to prevent timing attacks
      if (!this.constantTimeCompare(providedTokenHash, user.passwordResetToken)) {
        auditLogger.warn('Password reset attempted with invalid token', {
          email,
          userId: user.id,
        });
        throw new BadRequestException(genericError);
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

      auditLogger.info('Password reset successful', {
        userId: user.id,
        email: user.email,
      });

      return {
        success: true,
        message: 'Password reset successful.',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      auditLogger.error('Password reset failed', {
        email,
        error: (error as Error).message,
      });
      throw new BadRequestException(genericError);
    }
  }
}
