import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ForbiddenException } from '@shared/exceptions/http-exceptions';

/**
 * CSRF Protection Middleware using Double-Submit Cookie Pattern
 *
 * How it works:
 * 1. Server generates a random token and sends it as both:
 *    - A cookie (csrf_token) - automatically sent with requests
 *    - Available via /api/auth/csrf-token endpoint for SPA clients
 * 2. Client must include the token in requests as either:
 *    - X-CSRF-Token header (preferred for SPAs)
 *    - _csrf query parameter
 *    - _csrf body field
 * 3. Server validates that the submitted token matches the cookie token
 *
 * Security considerations:
 * - Cookie is SameSite=Strict to prevent cross-origin cookie inclusion
 * - Token is cryptographically random (32 bytes = 256 bits of entropy)
 * - Tokens are rotated on each request for additional security
 */

export interface CsrfOptions {
  /** Cookie name for CSRF token. Default: 'csrf_token' */
  cookieName?: string;
  /** Header name for CSRF token. Default: 'X-CSRF-Token' */
  headerName?: string;
  /** Whether to use secure cookies (HTTPS only). Default: true in production */
  secure?: boolean;
  /** SameSite cookie attribute. Default: 'strict' */
  sameSite?: 'strict' | 'lax' | 'none';
  /** Token byte length. Default: 32 (256 bits) */
  tokenLength?: number;
  /** Cookie path. Default: '/' */
  path?: string;
  /** Whether to rotate token on each request. Default: false */
  rotateOnRequest?: boolean;
}

const DEFAULT_OPTIONS: Required<CsrfOptions> = {
  cookieName: 'csrf_token',
  headerName: 'X-CSRF-Token',
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  tokenLength: 32,
  path: '/',
  rotateOnRequest: false,
};

/**
 * Generates a cryptographically secure CSRF token
 */
export function generateCsrfToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Extracts CSRF token from request (header, body, or query)
 */
function extractToken(req: Request, headerName: string): string | undefined {
  // Check header first (preferred for SPAs)
  const headerToken = req.get(headerName);
  if (headerToken) {
    return headerToken;
  }

  // Check body
  if (req.body && typeof req.body._csrf === 'string') {
    return req.body._csrf;
  }

  // Check query parameter
  if (typeof req.query._csrf === 'string') {
    return req.query._csrf;
  }

  return undefined;
}

/**
 * Sets the CSRF cookie on the response
 */
function setCsrfCookie(
  res: Response,
  token: string,
  options: Required<CsrfOptions>
): void {
  res.cookie(options.cookieName, token, {
    httpOnly: false, // Must be readable by JavaScript for SPA clients
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });
}

/**
 * Creates a CSRF protection middleware with the given options
 */
export function createCsrfProtection(userOptions: CsrfOptions = {}) {
  const options: Required<CsrfOptions> = { ...DEFAULT_OPTIONS, ...userOptions };

  /**
   * Middleware that ensures a CSRF token exists and sets it in the cookie
   * Call this on routes where you want to initialize or refresh the CSRF token
   */
  const ensureToken = (req: Request, res: Response, next: NextFunction): void => {
    const existingToken = req.cookies[options.cookieName];

    if (!existingToken || options.rotateOnRequest) {
      const newToken = generateCsrfToken(options.tokenLength);
      setCsrfCookie(res, newToken, options);
      // Make the new token available on the request for the current request
      (req as any).csrfToken = newToken;
    } else {
      (req as any).csrfToken = existingToken;
    }

    next();
  };

  /**
   * Middleware that validates the CSRF token for state-changing requests
   * This should be applied to POST, PUT, PATCH, DELETE routes
   */
  const validateToken = (req: Request, res: Response, next: NextFunction): void => {
    // Only validate for state-changing methods
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method.toUpperCase())) {
      return next();
    }

    const cookieToken = req.cookies[options.cookieName];
    const submittedToken = extractToken(req, options.headerName);

    // Both tokens must exist
    if (!cookieToken) {
      throw new ForbiddenException('CSRF token missing from cookie');
    }

    if (!submittedToken) {
      throw new ForbiddenException('CSRF token missing from request');
    }

    // Tokens must match (using constant-time comparison)
    if (!safeCompare(cookieToken, submittedToken)) {
      throw new ForbiddenException('CSRF token mismatch');
    }

    // Optionally rotate token after successful validation
    if (options.rotateOnRequest) {
      const newToken = generateCsrfToken(options.tokenLength);
      setCsrfCookie(res, newToken, options);
      (req as any).csrfToken = newToken;
    }

    next();
  };

  /**
   * Combined middleware that both ensures a token exists and validates it
   */
  const protect = (req: Request, res: Response, next: NextFunction): void => {
    // First ensure a token exists
    const existingToken = req.cookies[options.cookieName];
    if (!existingToken) {
      const newToken = generateCsrfToken(options.tokenLength);
      setCsrfCookie(res, newToken, options);
      (req as any).csrfToken = newToken;
    } else {
      (req as any).csrfToken = existingToken;
    }

    // Then validate for state-changing methods
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method.toUpperCase())) {
      return next();
    }

    const cookieToken = req.cookies[options.cookieName];
    const submittedToken = extractToken(req, options.headerName);

    if (!cookieToken) {
      throw new ForbiddenException('CSRF token missing from cookie');
    }

    if (!submittedToken) {
      throw new ForbiddenException('CSRF token missing from request');
    }

    if (!safeCompare(cookieToken, submittedToken)) {
      throw new ForbiddenException('CSRF token mismatch');
    }

    if (options.rotateOnRequest) {
      const newToken = generateCsrfToken(options.tokenLength);
      setCsrfCookie(res, newToken, options);
      (req as any).csrfToken = newToken;
    }

    next();
  };

  /**
   * Gets the current CSRF token from the request
   */
  const getToken = (req: Request): string => {
    return (req as any).csrfToken || req.cookies[options.cookieName] || '';
  };

  return {
    ensureToken,
    validateToken,
    protect,
    getToken,
    options,
  };
}

// Create default instance for convenience
const defaultCsrf = createCsrfProtection();

export const csrfEnsureToken = defaultCsrf.ensureToken;
export const csrfValidateToken = defaultCsrf.validateToken;
export const csrfProtect = defaultCsrf.protect;
export const getCsrfToken = defaultCsrf.getToken;

export default defaultCsrf;
