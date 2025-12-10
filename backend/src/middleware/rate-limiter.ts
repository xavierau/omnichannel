import rateLimit, { Options } from 'express-rate-limit';
import { Request, Response } from 'express';
import { RATE_LIMIT_CONSTANTS } from '@config/constants';

/**
 * Safely extract client identifier for rate limiting.
 * Handles IPv6 by using a consistent key format.
 */
function getClientKey(req: Request, prefix: string): string {
  const user = req.user as { id?: string } | undefined;
  if (user?.id) {
    return `${prefix}:user:${user.id}`;
  }
  // Use a hash of IP to avoid IPv6 issues while maintaining uniqueness
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return `${prefix}:ip:${ip.replace(/[:.]/g, '_')}`;
}

/**
 * Standard JSON error response for rate limit exceeded.
 * Includes proper HTTP status code and Retry-After header.
 */
interface RateLimitErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    retryAfter: number;
  };
}

/**
 * Creates a standardized rate limit error handler.
 * Returns JSON response with Retry-After header for proper client handling.
 */
function createRateLimitHandler(message: string) {
  return (req: Request, res: Response, next: unknown, options: Options) => {
    const retryAfterSeconds = Math.ceil(options.windowMs / 1000);

    const response: RateLimitErrorResponse = {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message,
        retryAfter: retryAfterSeconds,
      },
    };

    res.setHeader('Retry-After', retryAfterSeconds);
    res.status(429).json(response);
  };
}

/**
 * General rate limiter for all routes.
 * Provides baseline protection against abuse.
 */
export const generalLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONSTANTS.GENERAL.WINDOW_MS,
  max: RATE_LIMIT_CONSTANTS.GENERAL.MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler(
    'Too many requests from this IP, please try again later.'
  ),
});

/**
 * Strict rate limiter for login endpoint.
 * Prevents brute force password attacks.
 * Skips counting successful requests to avoid penalizing legitimate users.
 */
export const authLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONSTANTS.AUTH_LOGIN.WINDOW_MS,
  max: RATE_LIMIT_CONSTANTS.AUTH_LOGIN.MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: RATE_LIMIT_CONSTANTS.AUTH_LOGIN.SKIP_SUCCESSFUL,
  handler: createRateLimitHandler(
    'Too many login attempts. Please try again later.'
  ),
});

/**
 * Very strict rate limiter for registration endpoint.
 * Prevents mass account creation and spam registrations.
 * 5 requests per hour per IP is intentionally restrictive.
 */
export const registerLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONSTANTS.AUTH_REGISTER.WINDOW_MS,
  max: RATE_LIMIT_CONSTANTS.AUTH_REGISTER.MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler(
    'Too many registration attempts. Please try again in an hour.'
  ),
});

/**
 * Very strict rate limiter for password reset endpoint.
 * Prevents email enumeration attacks and spam.
 * 3 requests per hour forces attackers to be very slow.
 */
export const passwordResetLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONSTANTS.AUTH_PASSWORD_RESET.WINDOW_MS,
  max: RATE_LIMIT_CONSTANTS.AUTH_PASSWORD_RESET.MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler(
    'Too many password reset requests. Please try again in an hour.'
  ),
});

/**
 * Moderate rate limiter for token refresh endpoint.
 * Allows legitimate session maintenance while preventing abuse.
 * 30 requests per minute supports normal SPA behavior.
 */
export const refreshLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONSTANTS.AUTH_REFRESH.WINDOW_MS,
  max: RATE_LIMIT_CONSTANTS.AUTH_REFRESH.MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler(
    'Too many refresh requests. Please try again later.'
  ),
});

/**
 * Moderate rate limiter for CSRF token endpoint.
 * Allows frequent token fetches for SPAs while preventing abuse.
 * 60 requests per minute supports active user sessions.
 */
export const csrfTokenLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONSTANTS.AUTH_CSRF_TOKEN.WINDOW_MS,
  max: RATE_LIMIT_CONSTANTS.AUTH_CSRF_TOKEN.MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler(
    'Too many CSRF token requests. Please try again later.'
  ),
});

/**
 * Rate limiter for broadcast send/schedule actions.
 * Prevents abuse of resource-intensive broadcast operations.
 * 10 requests per minute per user.
 */
export const broadcastActionLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONSTANTS.BROADCAST_SEND.WINDOW_MS,
  max: RATE_LIMIT_CONSTANTS.BROADCAST_SEND.MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => getClientKey(req, 'broadcast'),
  validate: { xForwardedForHeader: false },
  handler: createRateLimitHandler(
    'Too many broadcast actions. Please wait before sending more broadcasts.'
  ),
});

/**
 * Strict rate limiter for broadcast bulk operations.
 * Prevents abuse of bulk pause/cancel/delete operations.
 * 5 requests per minute per user.
 */
export const broadcastBulkLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONSTANTS.BROADCAST_BULK.WINDOW_MS,
  max: RATE_LIMIT_CONSTANTS.BROADCAST_BULK.MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => getClientKey(req, 'broadcast_bulk'),
  validate: { xForwardedForHeader: false },
  handler: createRateLimitHandler(
    'Too many bulk operations. Please wait before performing more bulk actions.'
  ),
});

/**
 * Rate limiter for template submission to Meta.
 * Prevents spamming Meta's API which could cause rate limit blocks.
 * 5 requests per minute per user.
 */
export const templateSubmitLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONSTANTS.TEMPLATE_SUBMIT.WINDOW_MS,
  max: RATE_LIMIT_CONSTANTS.TEMPLATE_SUBMIT.MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => getClientKey(req, 'template_submit'),
  validate: { xForwardedForHeader: false },
  handler: createRateLimitHandler(
    'Too many template submissions. Please wait before submitting more templates.'
  ),
});

/**
 * Extract API key identifier for rate limiting.
 * Uses the key prefix (first 12 chars) or a hash of the full key
 * to provide consistent rate limiting per API key.
 *
 * Falls back to IP if no API key is present.
 */
function getApiKeyIdentifier(req: Request): string {
  // Try to get the API key from Authorization header or X-API-Key
  const authHeader = req.headers['authorization'];
  let apiKey: string | undefined;

  if (authHeader && typeof authHeader === 'string') {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      apiKey = parts[1];
    }
  }

  if (!apiKey) {
    const xApiKey = req.headers['x-api-key'];
    if (xApiKey && typeof xApiKey === 'string') {
      apiKey = xApiKey;
    }
  }

  if (apiKey) {
    // Use the key prefix (first 12 chars) for rate limiting
    // This is not sensitive and allows tracking per key
    const prefix = apiKey.substring(0, 12);
    return `agent_api:key:${prefix}`;
  }

  // Fall back to IP-based limiting
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return `agent_api:ip:${ip.replace(/[:.]/g, '_')}`;
}

/**
 * Rate limiter for Agent API endpoints.
 *
 * Security:
 * - Prevents brute force attacks on API key authentication
 * - Limits abuse from compromised API keys
 * - Rate limits per API key (using key prefix) rather than IP
 *   to properly track API key usage
 *
 * Configuration:
 * - 100 requests per minute per API key
 * - Stricter than general rate limiting due to authentication risk
 */
export const agentApiLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONSTANTS.AGENT_API.WINDOW_MS,
  max: RATE_LIMIT_CONSTANTS.AGENT_API.MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => getApiKeyIdentifier(req),
  validate: { xForwardedForHeader: false },
  handler: createRateLimitHandler(
    'Too many API requests. Please slow down and try again later.'
  ),
});
