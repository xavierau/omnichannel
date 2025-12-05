import { Router, Request, Response } from 'express';
import { container } from 'tsyringe';
import passport from 'passport';
import { AuthController } from './auth.controller';
import { authenticate } from '@middleware/authenticate';
import {
  authLimiter,
  registerLimiter,
  refreshLimiter,
  csrfTokenLimiter,
} from '@middleware/rate-limiter';
import { validateDto } from '@middleware/validate-dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  csrfEnsureToken,
  csrfValidateToken,
  getCsrfToken,
} from '@middleware/csrf-protection';

const router = Router();
const controller = container.resolve(AuthController);

/**
 * CSRF Token Endpoint
 * GET /api/auth/csrf-token
 *
 * Returns a CSRF token for SPA clients.
 * The token is also set as a cookie.
 * Call this endpoint before making state-changing requests.
 *
 * Rate limit: 60 requests per minute per IP
 */
router.get(
  '/csrf-token',
  csrfTokenLimiter,
  csrfEnsureToken,
  (req: Request, res: Response) => {
    res.json({
      data: {
        csrfToken: getCsrfToken(req),
      },
    });
  }
);

/**
 * Register new user
 * POST /api/auth/register
 *
 * CSRF protection is NOT applied here because:
 * - Registration is a public endpoint
 * - The user doesn't have a session/token yet
 * - Rate limiting provides protection against abuse
 *
 * Rate limit: 5 requests per hour per IP (prevents mass account creation)
 */
router.post(
  '/register',
  registerLimiter,
  validateDto(RegisterDto),
  controller.register
);

/**
 * Login with email and password
 * POST /api/auth/login
 *
 * CSRF protection is NOT applied here because:
 * - Login is an authentication endpoint that establishes the session
 * - The user doesn't have a valid CSRF token yet
 * - Rate limiting (authLimiter) provides protection against brute force
 *
 * After successful login, the client should fetch a CSRF token
 * via GET /api/auth/csrf-token
 *
 * Rate limit: 5 requests per minute per IP (skips successful requests)
 */
router.post(
  '/login',
  authLimiter,
  validateDto(LoginDto),
  passport.authenticate('local', { session: false }),
  controller.login
);

/**
 * Refresh access token using refresh token from cookie
 * POST /api/auth/refresh
 *
 * CSRF protection IS applied here because:
 * - This is a state-changing operation (token rotation)
 * - The user has an active session (refresh token in cookie)
 * - Attacker could exploit this to maintain access
 *
 * Rate limit: 30 requests per minute per IP
 */
router.post('/refresh', refreshLimiter, csrfValidateToken, controller.refresh);

/**
 * Logout (revoke refresh token)
 * POST /api/auth/logout
 *
 * CSRF protection IS applied here because:
 * - This is a state-changing operation
 * - We want to prevent attackers from logging users out
 * - The user has an active session
 *
 * Note: No specific rate limiter - logout should always be accessible
 */
router.post('/logout', csrfValidateToken, controller.logout);

/**
 * Get current user profile
 * GET /api/auth/me
 *
 * CSRF protection is not needed for GET requests
 * (safe method that doesn't change state)
 */
router.get('/me', authenticate, controller.getMe);

export default router;
