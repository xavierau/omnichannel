export declare const AUTH_CONSTANTS: {
    readonly REFRESH_TOKEN_EXPIRY_DAYS: 7;
    readonly ACCESS_TOKEN_EXPIRY: "15m";
    readonly MAX_LOGIN_ATTEMPTS: 5;
    readonly LOCKOUT_DURATION_MS: number;
    readonly TOKEN_ID_BYTES: 16;
    readonly TOKEN_SECRET_BYTES: 48;
    readonly PASSWORD_RESET_TOKEN_BYTES: 32;
    readonly PASSWORD_RESET_EXPIRY_HOURS: 1;
    readonly USER_CACHE_TTL_SECONDS: 300;
    readonly MIN_PASSWORD_LENGTH: 8;
    readonly MAX_PASSWORD_LENGTH: 128;
    readonly COMMON_PASSWORDS: readonly ["password", "12345678", "qwerty", "abc123", "password123", "admin", "letmein", "welcome", "123456", "password1"];
};
/**
 * Rate limiting constants for different endpoint categories.
 * These values are tuned to balance security and usability.
 */
export declare const RATE_LIMIT_CONSTANTS: {
    readonly GENERAL: {
        readonly WINDOW_MS: number;
        readonly MAX_REQUESTS: 100;
    };
    readonly AUTH_LOGIN: {
        readonly WINDOW_MS: number;
        readonly MAX_REQUESTS: 5;
        readonly SKIP_SUCCESSFUL: true;
    };
    readonly AUTH_REGISTER: {
        readonly WINDOW_MS: number;
        readonly MAX_REQUESTS: 5;
    };
    readonly AUTH_PASSWORD_RESET: {
        readonly WINDOW_MS: number;
        readonly MAX_REQUESTS: 3;
    };
    readonly AUTH_REFRESH: {
        readonly WINDOW_MS: number;
        readonly MAX_REQUESTS: 30;
    };
    readonly AUTH_CSRF_TOKEN: {
        readonly WINDOW_MS: number;
        readonly MAX_REQUESTS: 60;
    };
    readonly BROADCAST_SEND: {
        readonly WINDOW_MS: number;
        readonly MAX_REQUESTS: 10;
    };
    readonly BROADCAST_BULK: {
        readonly WINDOW_MS: number;
        readonly MAX_REQUESTS: 5;
    };
    readonly TEMPLATE_SUBMIT: {
        readonly WINDOW_MS: number;
        readonly MAX_REQUESTS: 5;
    };
    readonly AGENT_API: {
        readonly WINDOW_MS: number;
        readonly MAX_REQUESTS: 100;
    };
};
export declare const DB_CONSTANTS: {
    readonly CONNECTION_POOL_MAX: 20;
    readonly CONNECTION_POOL_MIN: 5;
    readonly CONNECTION_IDLE_TIMEOUT_MS: 30000;
    readonly CONNECTION_TIMEOUT_MS: 5000;
    readonly ACQUIRE_TIMEOUT_MS: 60000;
    readonly STATEMENT_TIMEOUT_MS: 30000;
    readonly MAX_RETRY_ATTEMPTS: 3;
    readonly RETRY_DELAY_MS: 1000;
};
export declare const INVITATION_CONSTANTS: {
    readonly TOKEN_BYTES: 32;
    readonly EXPIRY_HOURS: 24;
};
export declare const VALIDATION_CONSTANTS: {
    readonly EMAIL_MAX_LENGTH: 255;
    readonly NAME_MAX_LENGTH: 100;
    readonly NAME_MIN_LENGTH: 1;
    readonly NAME_PATTERN: RegExp;
};
export declare const CSRF_CONSTANTS: {
    readonly COOKIE_NAME: "csrf_token";
    readonly HEADER_NAME: "X-CSRF-Token";
    readonly TOKEN_LENGTH_BYTES: 32;
    readonly COOKIE_MAX_AGE_MS: number;
    readonly COOKIE_PATH: "/";
    readonly SAME_SITE: "strict";
};
