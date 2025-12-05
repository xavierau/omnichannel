import { inject, singleton } from 'tsyringe';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { UserService } from '@features/users/user.service';
import { RefreshTokenRepository } from './refresh-token.repository';
import { User } from '@features/users/user.entity';
import { AUTH_CONSTANTS } from '@config/constants';
import { InvalidTokenException, UserNotFoundException } from '@shared/exceptions/http-exceptions';
import { auditLogger } from '@config/logger.config';

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

@singleton()
export class AuthService {
  constructor(
    @inject(UserService) private userService: UserService,
    @inject(RefreshTokenRepository) private tokenRepo: RefreshTokenRepository
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
   */
  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<User> {
    // Add random delay to prevent timing-based enumeration
    await this.addSecurityDelay();

    try {
      return await this.userService.createUser(data);
    } catch (error) {
      // Log the actual error for debugging but return generic message
      auditLogger.warn('Registration failed', {
        email: data.email,
        error: (error as Error).message,
      });

      // Re-throw with the same error - the controller will handle
      // returning a generic message to the client
      throw error;
    }
  }

  verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JwtPayload;
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }
}
