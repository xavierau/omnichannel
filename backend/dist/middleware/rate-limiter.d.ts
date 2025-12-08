/**
 * General rate limiter for all routes.
 * Provides baseline protection against abuse.
 */
export declare const generalLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Strict rate limiter for login endpoint.
 * Prevents brute force password attacks.
 * Skips counting successful requests to avoid penalizing legitimate users.
 */
export declare const authLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Very strict rate limiter for registration endpoint.
 * Prevents mass account creation and spam registrations.
 * 5 requests per hour per IP is intentionally restrictive.
 */
export declare const registerLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Very strict rate limiter for password reset endpoint.
 * Prevents email enumeration attacks and spam.
 * 3 requests per hour forces attackers to be very slow.
 */
export declare const passwordResetLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Moderate rate limiter for token refresh endpoint.
 * Allows legitimate session maintenance while preventing abuse.
 * 30 requests per minute supports normal SPA behavior.
 */
export declare const refreshLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Moderate rate limiter for CSRF token endpoint.
 * Allows frequent token fetches for SPAs while preventing abuse.
 * 60 requests per minute supports active user sessions.
 */
export declare const csrfTokenLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Rate limiter for broadcast send/schedule actions.
 * Prevents abuse of resource-intensive broadcast operations.
 * 10 requests per minute per user.
 */
export declare const broadcastActionLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Strict rate limiter for broadcast bulk operations.
 * Prevents abuse of bulk pause/cancel/delete operations.
 * 5 requests per minute per user.
 */
export declare const broadcastBulkLimiter: import("express-rate-limit").RateLimitRequestHandler;
