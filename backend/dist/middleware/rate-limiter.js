"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastBulkLimiter = exports.broadcastActionLimiter = exports.csrfTokenLimiter = exports.refreshLimiter = exports.passwordResetLimiter = exports.registerLimiter = exports.authLimiter = exports.generalLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const constants_1 = require("../config/constants");
/**
 * Safely extract client identifier for rate limiting.
 * Handles IPv6 by using a consistent key format.
 */
function getClientKey(req, prefix) {
    const user = req.user;
    if (user?.id) {
        return `${prefix}:user:${user.id}`;
    }
    // Use a hash of IP to avoid IPv6 issues while maintaining uniqueness
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `${prefix}:ip:${ip.replace(/[:.]/g, '_')}`;
}
/**
 * Creates a standardized rate limit error handler.
 * Returns JSON response with Retry-After header for proper client handling.
 */
function createRateLimitHandler(message) {
    return (req, res, next, options) => {
        const retryAfterSeconds = Math.ceil(options.windowMs / 1000);
        const response = {
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
exports.generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: constants_1.RATE_LIMIT_CONSTANTS.GENERAL.WINDOW_MS,
    max: constants_1.RATE_LIMIT_CONSTANTS.GENERAL.MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler('Too many requests from this IP, please try again later.'),
});
/**
 * Strict rate limiter for login endpoint.
 * Prevents brute force password attacks.
 * Skips counting successful requests to avoid penalizing legitimate users.
 */
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: constants_1.RATE_LIMIT_CONSTANTS.AUTH_LOGIN.WINDOW_MS,
    max: constants_1.RATE_LIMIT_CONSTANTS.AUTH_LOGIN.MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: constants_1.RATE_LIMIT_CONSTANTS.AUTH_LOGIN.SKIP_SUCCESSFUL,
    handler: createRateLimitHandler('Too many login attempts. Please try again later.'),
});
/**
 * Very strict rate limiter for registration endpoint.
 * Prevents mass account creation and spam registrations.
 * 5 requests per hour per IP is intentionally restrictive.
 */
exports.registerLimiter = (0, express_rate_limit_1.default)({
    windowMs: constants_1.RATE_LIMIT_CONSTANTS.AUTH_REGISTER.WINDOW_MS,
    max: constants_1.RATE_LIMIT_CONSTANTS.AUTH_REGISTER.MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler('Too many registration attempts. Please try again in an hour.'),
});
/**
 * Very strict rate limiter for password reset endpoint.
 * Prevents email enumeration attacks and spam.
 * 3 requests per hour forces attackers to be very slow.
 */
exports.passwordResetLimiter = (0, express_rate_limit_1.default)({
    windowMs: constants_1.RATE_LIMIT_CONSTANTS.AUTH_PASSWORD_RESET.WINDOW_MS,
    max: constants_1.RATE_LIMIT_CONSTANTS.AUTH_PASSWORD_RESET.MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler('Too many password reset requests. Please try again in an hour.'),
});
/**
 * Moderate rate limiter for token refresh endpoint.
 * Allows legitimate session maintenance while preventing abuse.
 * 30 requests per minute supports normal SPA behavior.
 */
exports.refreshLimiter = (0, express_rate_limit_1.default)({
    windowMs: constants_1.RATE_LIMIT_CONSTANTS.AUTH_REFRESH.WINDOW_MS,
    max: constants_1.RATE_LIMIT_CONSTANTS.AUTH_REFRESH.MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler('Too many refresh requests. Please try again later.'),
});
/**
 * Moderate rate limiter for CSRF token endpoint.
 * Allows frequent token fetches for SPAs while preventing abuse.
 * 60 requests per minute supports active user sessions.
 */
exports.csrfTokenLimiter = (0, express_rate_limit_1.default)({
    windowMs: constants_1.RATE_LIMIT_CONSTANTS.AUTH_CSRF_TOKEN.WINDOW_MS,
    max: constants_1.RATE_LIMIT_CONSTANTS.AUTH_CSRF_TOKEN.MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler('Too many CSRF token requests. Please try again later.'),
});
/**
 * Rate limiter for broadcast send/schedule actions.
 * Prevents abuse of resource-intensive broadcast operations.
 * 10 requests per minute per user.
 */
exports.broadcastActionLimiter = (0, express_rate_limit_1.default)({
    windowMs: constants_1.RATE_LIMIT_CONSTANTS.BROADCAST_SEND.WINDOW_MS,
    max: constants_1.RATE_LIMIT_CONSTANTS.BROADCAST_SEND.MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getClientKey(req, 'broadcast'),
    validate: { xForwardedForHeader: false },
    handler: createRateLimitHandler('Too many broadcast actions. Please wait before sending more broadcasts.'),
});
/**
 * Strict rate limiter for broadcast bulk operations.
 * Prevents abuse of bulk pause/cancel/delete operations.
 * 5 requests per minute per user.
 */
exports.broadcastBulkLimiter = (0, express_rate_limit_1.default)({
    windowMs: constants_1.RATE_LIMIT_CONSTANTS.BROADCAST_BULK.WINDOW_MS,
    max: constants_1.RATE_LIMIT_CONSTANTS.BROADCAST_BULK.MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getClientKey(req, 'broadcast_bulk'),
    validate: { xForwardedForHeader: false },
    handler: createRateLimitHandler('Too many bulk operations. Please wait before performing more bulk actions.'),
});
