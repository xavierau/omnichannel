import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { AuthService } from './auth.service';
import { UserService } from '@features/users/user.service';
import { asyncHandler } from '@middleware/async-handler';
import { User } from '@features/users/user.entity';
import { WeakPasswordException, BadRequestException } from '@shared/exceptions/http-exceptions';
import { auditLogger } from '@config/logger.config';

/**
 * Generic error messages for authentication endpoints.
 * Using consistent messages prevents account enumeration attacks.
 */
const AUTH_ERROR_MESSAGES = {
  REGISTRATION_FAILED: 'Registration failed. Please check your input and try again.',
  INVALID_CREDENTIALS: 'Invalid email or password',
  PASSWORD_RESET_FAILED: 'Password reset failed. Please try again.',
} as const;

@singleton()
export class AuthController {
  constructor(
    @inject(AuthService) private authService: AuthService,
    @inject(UserService) private userService: UserService
  ) {}

  /**
   * Register a new user.
   *
   * Security: Returns generic error messages to prevent account enumeration.
   * Attackers cannot determine if an email is already registered based on
   * error messages or response timing.
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, firstName, lastName, companyName } = req.body;

    try {
      const user = await this.authService.register({
        email,
        password,
        firstName,
        lastName,
        companyName,
      });

      res.status(201).json({
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          status: user.status,
        },
      });
    } catch (error) {
      // Log the actual error for debugging/monitoring
      auditLogger.warn('Registration error', {
        email,
        errorType: (error as Error).constructor.name,
        // Do NOT log the password or detailed error message
      });

      // WeakPasswordException gets its own message (already generic)
      if (error instanceof WeakPasswordException) {
        return res.status(400).json({
          statusCode: 400,
          message: error.message,
        });
      }

      // All other errors return generic message to prevent enumeration
      // This includes: email already exists, database errors, etc.
      return res.status(400).json({
        statusCode: 400,
        message: AUTH_ERROR_MESSAGES.REGISTRATION_FAILED,
      });
    }
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User;
    const ipAddress = req.ip || '';
    const userAgent = req.get('user-agent') || '';

    const { accessToken, refreshToken } = await this.authService.login(
      user,
      ipAddress,
      userAgent
    );

    // Set httpOnly cookie for refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const permissions = await this.userService.getUserPermissions(user.id);

    res.json({
      data: {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          status: user.status,
          emailVerified: user.emailVerified,
          roles: user.roles.map((r) => ({
            id: r.id,
            name: r.name,
            displayName: r.displayName,
          })),
          permissions,
        },
      },
    });
  });

  refresh = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        statusCode: 401,
        message: 'No refresh token provided',
      });
    }

    try {
      const ipAddress = req.ip || '';
      const userAgent = req.get('user-agent') || '';

      // Token rotation: refreshAccessToken now returns both tokens
      const { accessToken, refreshToken: newRefreshToken } =
        await this.authService.refreshAccessToken(refreshToken, ipAddress, userAgent);

      // Set new httpOnly cookie with rotated refresh token
      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        data: {
          accessToken,
        },
      });
    } catch {
      res.clearCookie('refreshToken');
      return res.status(401).json({
        statusCode: 401,
        message: 'Invalid refresh token',
      });
    }
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;
    const user = req.user as User | undefined;

    if (refreshToken) {
      try {
        await this.authService.logout(refreshToken, user?.id);
      } catch {
        // Ignore errors during logout
      }
    }

    res.clearCookie('refreshToken');
    res.status(204).send();
  });

  getMe = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User;
    const permissions = await this.userService.getUserPermissions(user.id);

    res.json({
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        emailVerified: user.emailVerified,
        roles: user.roles.map((r) => ({
          id: r.id,
          name: r.name,
          displayName: r.displayName,
        })),
        permissions,
      },
    });
  });

  /**
   * Request a password reset email.
   *
   * Security: Always returns success to prevent email enumeration.
   * If email exists and user is active, a reset token will be generated.
   * In production, an email would be sent with the reset link.
   */
  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    const result = await this.authService.requestPasswordReset(email);

    // Log the request (but never log the token in production)
    auditLogger.info('Password reset requested', { email });

    // In development, include the token for testing purposes
    // In production, this would NEVER include the token
    const responseData: { message: string; token?: string } = {
      message: result.message,
    };

    if (process.env.NODE_ENV !== 'production' && result.token) {
      responseData.token = result.token;
    }

    res.status(200).json({
      data: responseData,
    });
  });

  /**
   * Reset password using the provided token.
   *
   * Security:
   * - Token is validated using constant-time comparison
   * - Token is invalidated after successful use
   * - All sessions are terminated after password change
   */
  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email, token, newPassword } = req.body;

    try {
      const result = await this.authService.resetPassword(email, token, newPassword);

      auditLogger.info('Password reset completed', { email });

      res.status(200).json({
        data: {
          message: result.message,
        },
      });
    } catch (error) {
      // Log the actual error for debugging
      auditLogger.warn('Password reset failed', {
        email,
        errorType: (error as Error).constructor.name,
      });

      // WeakPasswordException gets its own message
      if (error instanceof WeakPasswordException) {
        return res.status(400).json({
          statusCode: 400,
          message: error.message,
        });
      }

      // BadRequestException from AuthService (invalid token)
      if (error instanceof BadRequestException) {
        return res.status(400).json({
          statusCode: 400,
          message: error.message,
        });
      }

      // Generic error for other cases
      return res.status(400).json({
        statusCode: 400,
        message: AUTH_ERROR_MESSAGES.PASSWORD_RESET_FAILED,
      });
    }
  });
}
