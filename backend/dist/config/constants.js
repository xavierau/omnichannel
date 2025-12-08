"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSRF_CONSTANTS = exports.VALIDATION_CONSTANTS = exports.INVITATION_CONSTANTS = exports.DB_CONSTANTS = exports.RATE_LIMIT_CONSTANTS = exports.AUTH_CONSTANTS = void 0;
exports.AUTH_CONSTANTS = {
    // Token expiry
    REFRESH_TOKEN_EXPIRY_DAYS: 7,
    ACCESS_TOKEN_EXPIRY: '15m',
    // Account security
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes
    // Token identifier sizes
    TOKEN_ID_BYTES: 16,
    TOKEN_SECRET_BYTES: 48,
    // Password reset
    PASSWORD_RESET_TOKEN_BYTES: 32, // 256 bits of entropy
    PASSWORD_RESET_EXPIRY_HOURS: 1, // Token valid for 1 hour
    // Cache TTL
    USER_CACHE_TTL_SECONDS: 300, // 5 minutes
    // Password policy
    MIN_PASSWORD_LENGTH: 8,
    MAX_PASSWORD_LENGTH: 128,
    // Common weak passwords (extend this list in production)
    COMMON_PASSWORDS: [
        'password',
        '12345678',
        'qwerty',
        'abc123',
        'password123',
        'admin',
        'letmein',
        'welcome',
        '123456',
        'password1',
    ],
};
/**
 * Rate limiting constants for different endpoint categories.
 * These values are tuned to balance security and usability.
 */
exports.RATE_LIMIT_CONSTANTS = {
    // General API rate limiting
    GENERAL: {
        WINDOW_MS: 60 * 1000, // 1 minute
        MAX_REQUESTS: 100,
    },
    // Login endpoint - strict to prevent brute force attacks
    AUTH_LOGIN: {
        WINDOW_MS: 60 * 1000, // 1 minute
        MAX_REQUESTS: 5,
        SKIP_SUCCESSFUL: true, // Don't count successful logins
    },
    // Registration endpoint - very strict to prevent mass account creation
    AUTH_REGISTER: {
        WINDOW_MS: 60 * 60 * 1000, // 1 hour
        MAX_REQUESTS: 5,
    },
    // Password reset - strict to prevent enumeration and spam
    AUTH_PASSWORD_RESET: {
        WINDOW_MS: 60 * 60 * 1000, // 1 hour
        MAX_REQUESTS: 3,
    },
    // Token refresh - moderate limit for legitimate session maintenance
    AUTH_REFRESH: {
        WINDOW_MS: 60 * 1000, // 1 minute
        MAX_REQUESTS: 30,
    },
    // CSRF token endpoint - moderate limit for SPA operations
    AUTH_CSRF_TOKEN: {
        WINDOW_MS: 60 * 1000, // 1 minute
        MAX_REQUESTS: 60,
    },
    // Broadcast send/schedule actions - strict to prevent abuse
    BROADCAST_SEND: {
        WINDOW_MS: 60 * 1000, // 1 minute
        MAX_REQUESTS: 10,
    },
    // Broadcast bulk operations - very strict
    BROADCAST_BULK: {
        WINDOW_MS: 60 * 1000, // 1 minute
        MAX_REQUESTS: 5,
    },
};
exports.DB_CONSTANTS = {
    // Connection pool sizing
    CONNECTION_POOL_MAX: 20,
    CONNECTION_POOL_MIN: 5,
    // Timeout settings (in milliseconds)
    CONNECTION_IDLE_TIMEOUT_MS: 30000, // 30 seconds - time before idle connection is released
    CONNECTION_TIMEOUT_MS: 5000, // 5 seconds - time to establish a connection
    ACQUIRE_TIMEOUT_MS: 60000, // 60 seconds - max time to wait for available connection
    // Connection validation
    STATEMENT_TIMEOUT_MS: 30000, // 30 seconds - max time for a single statement
    // Retry settings
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1000, // 1 second between retries
};
exports.INVITATION_CONSTANTS = {
    TOKEN_BYTES: 32, // 256 bits of entropy
    EXPIRY_HOURS: 24, // 24 hours as requested
};
exports.VALIDATION_CONSTANTS = {
    EMAIL_MAX_LENGTH: 255,
    NAME_MAX_LENGTH: 100,
    NAME_MIN_LENGTH: 1,
    NAME_PATTERN: /^[a-zA-Z\s'-]+$/,
};
exports.CSRF_CONSTANTS = {
    // Cookie and header names
    COOKIE_NAME: 'csrf_token',
    HEADER_NAME: 'X-CSRF-Token',
    // Token configuration
    TOKEN_LENGTH_BYTES: 32, // 256 bits of entropy
    // Cookie settings
    COOKIE_MAX_AGE_MS: 24 * 60 * 60 * 1000, // 24 hours
    COOKIE_PATH: '/',
    SAME_SITE: 'strict',
};
