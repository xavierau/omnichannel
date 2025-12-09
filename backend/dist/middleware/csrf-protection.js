"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCsrfToken = exports.csrfProtect = exports.csrfValidateToken = exports.csrfEnsureToken = void 0;
exports.generateCsrfToken = generateCsrfToken;
exports.createCsrfProtection = createCsrfProtection;
const crypto_1 = __importDefault(require("crypto"));
const http_exceptions_1 = require("../shared/exceptions/http-exceptions");
const DEFAULT_OPTIONS = {
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
function generateCsrfToken(length = 32) {
    return crypto_1.default.randomBytes(length).toString('hex');
}
/**
 * Constant-time string comparison to prevent timing attacks
 */
function safeCompare(a, b) {
    if (a.length !== b.length) {
        return false;
    }
    return crypto_1.default.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
/**
 * Extracts CSRF token from request (header, body, or query)
 */
function extractToken(req, headerName) {
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
function setCsrfCookie(res, token, options) {
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
function createCsrfProtection(userOptions = {}) {
    const options = { ...DEFAULT_OPTIONS, ...userOptions };
    /**
     * Middleware that ensures a CSRF token exists and sets it in the cookie
     * Call this on routes where you want to initialize or refresh the CSRF token
     */
    const ensureToken = (req, res, next) => {
        const csrfReq = req;
        const existingToken = req.cookies[options.cookieName];
        if (!existingToken || options.rotateOnRequest) {
            const newToken = generateCsrfToken(options.tokenLength);
            setCsrfCookie(res, newToken, options);
            // Make the new token available on the request for the current request
            csrfReq.csrfToken = newToken;
        }
        else {
            csrfReq.csrfToken = existingToken;
        }
        next();
    };
    /**
     * Middleware that validates the CSRF token for state-changing requests
     * This should be applied to POST, PUT, PATCH, DELETE routes
     */
    const validateToken = (req, res, next) => {
        // Only validate for state-changing methods
        const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
        if (safeMethods.includes(req.method.toUpperCase())) {
            return next();
        }
        const cookieToken = req.cookies[options.cookieName];
        const submittedToken = extractToken(req, options.headerName);
        // Both tokens must exist
        if (!cookieToken) {
            throw new http_exceptions_1.ForbiddenException('CSRF token missing from cookie');
        }
        if (!submittedToken) {
            throw new http_exceptions_1.ForbiddenException('CSRF token missing from request');
        }
        // Tokens must match (using constant-time comparison)
        if (!safeCompare(cookieToken, submittedToken)) {
            throw new http_exceptions_1.ForbiddenException('CSRF token mismatch');
        }
        // Optionally rotate token after successful validation
        if (options.rotateOnRequest) {
            const csrfReq = req;
            const newToken = generateCsrfToken(options.tokenLength);
            setCsrfCookie(res, newToken, options);
            csrfReq.csrfToken = newToken;
        }
        next();
    };
    /**
     * Combined middleware that both ensures a token exists and validates it
     */
    const protect = (req, res, next) => {
        const csrfReq = req;
        // First ensure a token exists
        const existingToken = req.cookies[options.cookieName];
        if (!existingToken) {
            const newToken = generateCsrfToken(options.tokenLength);
            setCsrfCookie(res, newToken, options);
            csrfReq.csrfToken = newToken;
        }
        else {
            csrfReq.csrfToken = existingToken;
        }
        // Then validate for state-changing methods
        const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
        if (safeMethods.includes(req.method.toUpperCase())) {
            return next();
        }
        const cookieToken = req.cookies[options.cookieName];
        const submittedToken = extractToken(req, options.headerName);
        if (!cookieToken) {
            throw new http_exceptions_1.ForbiddenException('CSRF token missing from cookie');
        }
        if (!submittedToken) {
            throw new http_exceptions_1.ForbiddenException('CSRF token missing from request');
        }
        if (!safeCompare(cookieToken, submittedToken)) {
            throw new http_exceptions_1.ForbiddenException('CSRF token mismatch');
        }
        if (options.rotateOnRequest) {
            const newToken = generateCsrfToken(options.tokenLength);
            setCsrfCookie(res, newToken, options);
            csrfReq.csrfToken = newToken;
        }
        next();
    };
    /**
     * Gets the current CSRF token from the request
     */
    const getToken = (req) => {
        const csrfReq = req;
        return csrfReq.csrfToken || req.cookies[options.cookieName] || '';
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
exports.csrfEnsureToken = defaultCsrf.ensureToken;
exports.csrfValidateToken = defaultCsrf.validateToken;
exports.csrfProtect = defaultCsrf.protect;
exports.getCsrfToken = defaultCsrf.getToken;
exports.default = defaultCsrf;
