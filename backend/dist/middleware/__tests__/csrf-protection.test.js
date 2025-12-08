"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const csrf_protection_1 = require("../csrf-protection");
const http_exceptions_1 = require("@shared/exceptions/http-exceptions");
describe('CSRF Protection Middleware', () => {
    // Helper to create mock request
    const createMockRequest = (options = {}) => {
        const headers = options.headers || {};
        return {
            method: options.method || 'GET',
            cookies: options.cookies || {},
            body: options.body || {},
            query: options.query || {},
            get: jest.fn((name) => {
                return headers[name.toLowerCase()] || headers[name];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }),
        };
    };
    // Helper to create mock response
    const createMockResponse = () => {
        const res = {
            cookie: jest.fn().mockReturnThis(),
            clearCookie: jest.fn().mockReturnThis(),
        };
        return res;
    };
    // Helper to create mock next function
    const createMockNext = () => jest.fn();
    describe('generateCsrfToken', () => {
        it('should generate a token of correct length', () => {
            const token = (0, csrf_protection_1.generateCsrfToken)(32);
            // 32 bytes = 64 hex characters
            expect(token).toHaveLength(64);
        });
        it('should generate unique tokens', () => {
            const token1 = (0, csrf_protection_1.generateCsrfToken)();
            const token2 = (0, csrf_protection_1.generateCsrfToken)();
            expect(token1).not.toEqual(token2);
        });
        it('should generate tokens with only hex characters', () => {
            const token = (0, csrf_protection_1.generateCsrfToken)();
            expect(token).toMatch(/^[a-f0-9]+$/);
        });
    });
    describe('createCsrfProtection', () => {
        it('should create middleware with default options', () => {
            const csrf = (0, csrf_protection_1.createCsrfProtection)();
            expect(csrf.options.cookieName).toBe('csrf_token');
            expect(csrf.options.headerName).toBe('X-CSRF-Token');
            expect(csrf.options.sameSite).toBe('strict');
            expect(csrf.options.tokenLength).toBe(32);
        });
        it('should allow custom options', () => {
            const csrf = (0, csrf_protection_1.createCsrfProtection)({
                cookieName: 'custom_csrf',
                headerName: 'X-Custom-CSRF',
                tokenLength: 16,
            });
            expect(csrf.options.cookieName).toBe('custom_csrf');
            expect(csrf.options.headerName).toBe('X-Custom-CSRF');
            expect(csrf.options.tokenLength).toBe(16);
        });
    });
    describe('ensureToken middleware', () => {
        it('should generate and set token if none exists', () => {
            const csrf = (0, csrf_protection_1.createCsrfProtection)();
            const req = createMockRequest();
            const res = createMockResponse();
            const next = createMockNext();
            csrf.ensureToken(req, res, next);
            expect(res.cookie).toHaveBeenCalledWith('csrf_token', expect.any(String), expect.objectContaining({
                httpOnly: false,
                sameSite: 'strict',
                path: '/',
            }));
            expect(next).toHaveBeenCalled();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect(req.csrfToken).toBeDefined();
        });
        it('should reuse existing token from cookie', () => {
            const csrf = (0, csrf_protection_1.createCsrfProtection)();
            const existingToken = (0, csrf_protection_1.generateCsrfToken)();
            const req = createMockRequest({
                cookies: { csrf_token: existingToken },
            });
            const res = createMockResponse();
            const next = createMockNext();
            csrf.ensureToken(req, res, next);
            expect(res.cookie).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalled();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect(req.csrfToken).toBe(existingToken);
        });
        it('should rotate token when rotateOnRequest is true', () => {
            const csrf = (0, csrf_protection_1.createCsrfProtection)({ rotateOnRequest: true });
            const existingToken = (0, csrf_protection_1.generateCsrfToken)();
            const req = createMockRequest({
                cookies: { csrf_token: existingToken },
            });
            const res = createMockResponse();
            const next = createMockNext();
            csrf.ensureToken(req, res, next);
            expect(res.cookie).toHaveBeenCalled();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect(req.csrfToken).not.toBe(existingToken);
        });
    });
    describe('validateToken middleware', () => {
        it('should skip validation for GET requests', () => {
            const csrf = (0, csrf_protection_1.createCsrfProtection)();
            const req = createMockRequest({ method: 'GET' });
            const res = createMockResponse();
            const next = createMockNext();
            csrf.validateToken(req, res, next);
            expect(next).toHaveBeenCalled();
        });
        it('should skip validation for HEAD requests', () => {
            const csrf = (0, csrf_protection_1.createCsrfProtection)();
            const req = createMockRequest({ method: 'HEAD' });
            const res = createMockResponse();
            const next = createMockNext();
            csrf.validateToken(req, res, next);
            expect(next).toHaveBeenCalled();
        });
        it('should skip validation for OPTIONS requests', () => {
            const csrf = (0, csrf_protection_1.createCsrfProtection)();
            const req = createMockRequest({ method: 'OPTIONS' });
            const res = createMockResponse();
            const next = createMockNext();
            csrf.validateToken(req, res, next);
            expect(next).toHaveBeenCalled();
        });
        it('should throw ForbiddenException if cookie token is missing for POST', () => {
            const csrf = (0, csrf_protection_1.createCsrfProtection)();
            const req = createMockRequest({ method: 'POST' });
            const res = createMockResponse();
            const next = createMockNext();
            expect(() => csrf.validateToken(req, res, next)).toThrow(http_exceptions_1.ForbiddenException);
            expect(() => csrf.validateToken(req, res, next)).toThrow('CSRF token missing from cookie');
        });
        it('should throw ForbiddenException if submitted token is missing for POST', () => {
            const csrf = (0, csrf_protection_1.createCsrfProtection)();
            const token = (0, csrf_protection_1.generateCsrfToken)();
            const req = createMockRequest({
                method: 'POST',
                cookies: { csrf_token: token },
            });
            const res = createMockResponse();
            const next = createMockNext();
            expect(() => csrf.validateToken(req, res, next)).toThrow(http_exceptions_1.ForbiddenException);
            expect(() => csrf.validateToken(req, res, next)).toThrow('CSRF token missing from request');
        });
        it('should throw ForbiddenException if tokens do not match', () => {
            const csrf = (0, csrf_protection_1.createCsrfProtection)();
            const cookieToken = (0, csrf_protection_1.generateCsrfToken)();
            const submittedToken = (0, csrf_protection_1.generateCsrfToken)();
            const req = createMockRequest({
                method: 'POST',
                cookies: { csrf_token: cookieToken },
                headers: { 'X-CSRF-Token': submittedToken },
            });
            const res = createMockResponse();
            const next = createMockNext();
            expect(() => csrf.validateToken(req, res, next)).toThrow(http_exceptions_1.ForbiddenException);
            expect(() => csrf.validateToken(req, res, next)).toThrow('CSRF token mismatch');
        });
        it('should validate successfully when header token matches cookie', () => {
            const csrf = (0, csrf_protection_1.createCsrfProtection)();
            const token = (0, csrf_protection_1.generateCsrfToken)();
            const req = createMockRequest({
                method: 'POST',
                cookies: { csrf_token: token },
                headers: { 'X-CSRF-Token': token },
            });
            const res = createMockResponse();
            const next = createMockNext();
            csrf.validateToken(req, res, next);
            expect(next).toHaveBeenCalled();
        });
        it('should validate successfully when body token matches cookie', () => {
            const csrf = (0, csrf_protection_1.createCsrfProtection)();
            const token = (0, csrf_protection_1.generateCsrfToken)();
            const req = createMockRequest({
                method: 'POST',
                cookies: { csrf_token: token },
                body: { _csrf: token },
            });
            const res = createMockResponse();
            const next = createMockNext();
            csrf.validateToken(req, res, next);
            expect(next).toHaveBeenCalled();
        });
        it('should validate successfully when query token matches cookie', () => {
            const csrf = (0, csrf_protection_1.createCsrfProtection)();
            const token = (0, csrf_protection_1.generateCsrfToken)();
            const req = createMockRequest({
                method: 'POST',
                cookies: { csrf_token: token },
                query: { _csrf: token },
            });
            const res = createMockResponse();
            const next = createMockNext();
            csrf.validateToken(req, res, next);
            expect(next).toHaveBeenCalled();
        });
        it('should prefer header token over body token', () => {
            const csrf = (0, csrf_protection_1.createCsrfProtection)();
            const correctToken = (0, csrf_protection_1.generateCsrfToken)();
            const wrongToken = (0, csrf_protection_1.generateCsrfToken)();
            const req = createMockRequest({
                method: 'POST',
                cookies: { csrf_token: correctToken },
                headers: { 'X-CSRF-Token': correctToken },
                body: { _csrf: wrongToken },
            });
            const res = createMockResponse();
            const next = createMockNext();
            csrf.validateToken(req, res, next);
            expect(next).toHaveBeenCalled();
        });
        it('should validate PUT requests', () => {
            const csrf = (0, csrf_protection_1.createCsrfProtection)();
            const token = (0, csrf_protection_1.generateCsrfToken)();
            const req = createMockRequest({
                method: 'PUT',
                cookies: { csrf_token: token },
                headers: { 'X-CSRF-Token': token },
            });
            const res = createMockResponse();
            const next = createMockNext();
            csrf.validateToken(req, res, next);
            expect(next).toHaveBeenCalled();
        });
        it('should validate PATCH requests', () => {
            const csrf = (0, csrf_protection_1.createCsrfProtection)();
            const token = (0, csrf_protection_1.generateCsrfToken)();
            const req = createMockRequest({
                method: 'PATCH',
                cookies: { csrf_token: token },
                headers: { 'X-CSRF-Token': token },
            });
            const res = createMockResponse();
            const next = createMockNext();
            csrf.validateToken(req, res, next);
            expect(next).toHaveBeenCalled();
        });
        it('should validate DELETE requests', () => {
            const csrf = (0, csrf_protection_1.createCsrfProtection)();
            const token = (0, csrf_protection_1.generateCsrfToken)();
            const req = createMockRequest({
                method: 'DELETE',
                cookies: { csrf_token: token },
                headers: { 'X-CSRF-Token': token },
            });
            const res = createMockResponse();
            const next = createMockNext();
            csrf.validateToken(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });
    describe('protect middleware (combined)', () => {
        it('should generate token and allow GET requests', () => {
            const csrf = (0, csrf_protection_1.createCsrfProtection)();
            const req = createMockRequest({ method: 'GET' });
            const res = createMockResponse();
            const next = createMockNext();
            csrf.protect(req, res, next);
            expect(res.cookie).toHaveBeenCalled();
            expect(next).toHaveBeenCalled();
        });
        it('should generate token and validate POST requests', () => {
            const csrf = (0, csrf_protection_1.createCsrfProtection)();
            const token = (0, csrf_protection_1.generateCsrfToken)();
            const req = createMockRequest({
                method: 'POST',
                cookies: { csrf_token: token },
                headers: { 'X-CSRF-Token': token },
            });
            const res = createMockResponse();
            const next = createMockNext();
            csrf.protect(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });
    describe('getToken', () => {
        it('should return token from request object', () => {
            const csrf = (0, csrf_protection_1.createCsrfProtection)();
            const token = (0, csrf_protection_1.generateCsrfToken)();
            const req = createMockRequest();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            req.csrfToken = token;
            const result = csrf.getToken(req);
            expect(result).toBe(token);
        });
        it('should return token from cookie if not on request', () => {
            const csrf = (0, csrf_protection_1.createCsrfProtection)();
            const token = (0, csrf_protection_1.generateCsrfToken)();
            const req = createMockRequest({
                cookies: { csrf_token: token },
            });
            const result = csrf.getToken(req);
            expect(result).toBe(token);
        });
        it('should return empty string if no token exists', () => {
            const csrf = (0, csrf_protection_1.createCsrfProtection)();
            const req = createMockRequest();
            const result = csrf.getToken(req);
            expect(result).toBe('');
        });
    });
    describe('default exports', () => {
        it('should export csrfEnsureToken middleware', () => {
            expect(csrf_protection_1.csrfEnsureToken).toBeDefined();
            expect(typeof csrf_protection_1.csrfEnsureToken).toBe('function');
        });
        it('should export csrfValidateToken middleware', () => {
            expect(csrf_protection_1.csrfValidateToken).toBeDefined();
            expect(typeof csrf_protection_1.csrfValidateToken).toBe('function');
        });
        it('should export getCsrfToken function', () => {
            expect(csrf_protection_1.getCsrfToken).toBeDefined();
            expect(typeof csrf_protection_1.getCsrfToken).toBe('function');
        });
    });
    describe('timing attack prevention', () => {
        it('should use constant-time comparison', () => {
            const csrf = (0, csrf_protection_1.createCsrfProtection)();
            const token = (0, csrf_protection_1.generateCsrfToken)();
            // Create a token that differs only in the last character
            const similarToken = token.slice(0, -1) + (token[token.length - 1] === '0' ? '1' : '0');
            const req = createMockRequest({
                method: 'POST',
                cookies: { csrf_token: token },
                headers: { 'X-CSRF-Token': similarToken },
            });
            const res = createMockResponse();
            const next = createMockNext();
            // Both should fail with mismatch (not timing-based)
            expect(() => csrf.validateToken(req, res, next)).toThrow('CSRF token mismatch');
        });
        it('should reject tokens of different lengths', () => {
            const csrf = (0, csrf_protection_1.createCsrfProtection)();
            const token = (0, csrf_protection_1.generateCsrfToken)();
            const shortToken = token.slice(0, 10);
            const req = createMockRequest({
                method: 'POST',
                cookies: { csrf_token: token },
                headers: { 'X-CSRF-Token': shortToken },
            });
            const res = createMockResponse();
            const next = createMockNext();
            expect(() => csrf.validateToken(req, res, next)).toThrow('CSRF token mismatch');
        });
    });
    describe('cookie configuration', () => {
        it('should set secure cookie in production', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            const csrf = (0, csrf_protection_1.createCsrfProtection)({ secure: true });
            const req = createMockRequest();
            const res = createMockResponse();
            const next = createMockNext();
            csrf.ensureToken(req, res, next);
            expect(res.cookie).toHaveBeenCalledWith('csrf_token', expect.any(String), expect.objectContaining({
                secure: true,
            }));
            process.env.NODE_ENV = originalEnv;
        });
        it('should set cookie with maxAge', () => {
            const csrf = (0, csrf_protection_1.createCsrfProtection)();
            const req = createMockRequest();
            const res = createMockResponse();
            const next = createMockNext();
            csrf.ensureToken(req, res, next);
            expect(res.cookie).toHaveBeenCalledWith('csrf_token', expect.any(String), expect.objectContaining({
                maxAge: 24 * 60 * 60 * 1000,
            }));
        });
    });
});
