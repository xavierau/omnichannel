"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const rate_limiter_1 = require("../rate-limiter");
const constants_1 = require("@config/constants");
/**
 * Unit and integration tests for rate limiting middleware.
 *
 * These tests verify:
 * 1. Correct configuration of each limiter
 * 2. Proper JSON error responses with Retry-After header
 * 3. Rate limit constants are correctly applied
 * 4. Middleware behaves correctly in an Express app context
 */
describe('Rate Limiters', () => {
    describe('RATE_LIMIT_CONSTANTS', () => {
        it('should have correct general rate limit values', () => {
            expect(constants_1.RATE_LIMIT_CONSTANTS.GENERAL.WINDOW_MS).toBe(60 * 1000);
            expect(constants_1.RATE_LIMIT_CONSTANTS.GENERAL.MAX_REQUESTS).toBe(100);
        });
        it('should have correct auth login rate limit values', () => {
            expect(constants_1.RATE_LIMIT_CONSTANTS.AUTH_LOGIN.WINDOW_MS).toBe(60 * 1000);
            expect(constants_1.RATE_LIMIT_CONSTANTS.AUTH_LOGIN.MAX_REQUESTS).toBe(5);
            expect(constants_1.RATE_LIMIT_CONSTANTS.AUTH_LOGIN.SKIP_SUCCESSFUL).toBe(true);
        });
        it('should have correct registration rate limit values', () => {
            expect(constants_1.RATE_LIMIT_CONSTANTS.AUTH_REGISTER.WINDOW_MS).toBe(60 * 60 * 1000);
            expect(constants_1.RATE_LIMIT_CONSTANTS.AUTH_REGISTER.MAX_REQUESTS).toBe(5);
        });
        it('should have correct password reset rate limit values', () => {
            expect(constants_1.RATE_LIMIT_CONSTANTS.AUTH_PASSWORD_RESET.WINDOW_MS).toBe(60 * 60 * 1000);
            expect(constants_1.RATE_LIMIT_CONSTANTS.AUTH_PASSWORD_RESET.MAX_REQUESTS).toBe(3);
        });
        it('should have correct refresh rate limit values', () => {
            expect(constants_1.RATE_LIMIT_CONSTANTS.AUTH_REFRESH.WINDOW_MS).toBe(60 * 1000);
            expect(constants_1.RATE_LIMIT_CONSTANTS.AUTH_REFRESH.MAX_REQUESTS).toBe(30);
        });
        it('should have correct CSRF token rate limit values', () => {
            expect(constants_1.RATE_LIMIT_CONSTANTS.AUTH_CSRF_TOKEN.WINDOW_MS).toBe(60 * 1000);
            expect(constants_1.RATE_LIMIT_CONSTANTS.AUTH_CSRF_TOKEN.MAX_REQUESTS).toBe(60);
        });
    });
    describe('Rate limit error response format', () => {
        it('all limiters should be express middleware functions', () => {
            const limiters = [
                rate_limiter_1.generalLimiter,
                rate_limiter_1.authLimiter,
                rate_limiter_1.registerLimiter,
                rate_limiter_1.passwordResetLimiter,
                rate_limiter_1.refreshLimiter,
                rate_limiter_1.csrfTokenLimiter,
            ];
            limiters.forEach((limiter) => {
                expect(typeof limiter).toBe('function');
                expect(limiter.length).toBe(3); // Express middleware: (req, res, next)
            });
        });
    });
    describe('Rate limit windows are appropriate for security', () => {
        it('registration window should be at least 1 hour', () => {
            const oneHourMs = 60 * 60 * 1000;
            expect(constants_1.RATE_LIMIT_CONSTANTS.AUTH_REGISTER.WINDOW_MS).toBeGreaterThanOrEqual(oneHourMs);
        });
        it('password reset window should be at least 1 hour', () => {
            const oneHourMs = 60 * 60 * 1000;
            expect(constants_1.RATE_LIMIT_CONSTANTS.AUTH_PASSWORD_RESET.WINDOW_MS).toBeGreaterThanOrEqual(oneHourMs);
        });
        it('login should have very strict limits to prevent brute force', () => {
            expect(constants_1.RATE_LIMIT_CONSTANTS.AUTH_LOGIN.MAX_REQUESTS).toBeLessThanOrEqual(10);
        });
        it('registration should have very strict limits to prevent mass accounts', () => {
            expect(constants_1.RATE_LIMIT_CONSTANTS.AUTH_REGISTER.MAX_REQUESTS).toBeLessThanOrEqual(10);
        });
        it('password reset should have strictest limits to prevent enumeration', () => {
            expect(constants_1.RATE_LIMIT_CONSTANTS.AUTH_PASSWORD_RESET.MAX_REQUESTS).toBeLessThanOrEqual(5);
        });
    });
    describe('Password reset limiter integration', () => {
        let app;
        beforeEach(() => {
            app = (0, express_1.default)();
            app.use(express_1.default.json());
            app.post('/password-reset', rate_limiter_1.passwordResetLimiter, (req, res) => {
                res.json({ success: true });
            });
        });
        it('should allow requests within the rate limit', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/password-reset')
                .send({ email: 'test@example.com' });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
        it('should block requests after exceeding the rate limit', async () => {
            // Make 3 requests (the limit)
            for (let i = 0; i < constants_1.RATE_LIMIT_CONSTANTS.AUTH_PASSWORD_RESET.MAX_REQUESTS; i++) {
                await (0, supertest_1.default)(app)
                    .post('/password-reset')
                    .send({ email: 'test@example.com' });
            }
            // The next request should be blocked
            const response = await (0, supertest_1.default)(app)
                .post('/password-reset')
                .send({ email: 'test@example.com' });
            expect(response.status).toBe(429);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
            expect(response.body.error.message).toContain('password reset');
            expect(response.body.error.retryAfter).toBeDefined();
            expect(response.headers['retry-after']).toBeDefined();
        });
        it('should include RateLimit headers in response', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/password-reset')
                .send({ email: 'test@example.com' });
            expect(response.headers['ratelimit-limit']).toBeDefined();
            expect(response.headers['ratelimit-remaining']).toBeDefined();
            expect(response.headers['ratelimit-reset']).toBeDefined();
        });
    });
    describe('Register limiter integration', () => {
        let app;
        beforeEach(() => {
            app = (0, express_1.default)();
            app.use(express_1.default.json());
            app.post('/register', rate_limiter_1.registerLimiter, (req, res) => {
                res.json({ success: true });
            });
        });
        it('should allow first registration request', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/register')
                .send({ email: 'test@example.com', password: 'securePassword123!' });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
        it('should block after 5 registration attempts', async () => {
            // Make 5 requests (the limit)
            for (let i = 0; i < constants_1.RATE_LIMIT_CONSTANTS.AUTH_REGISTER.MAX_REQUESTS; i++) {
                await (0, supertest_1.default)(app)
                    .post('/register')
                    .send({ email: `test${i}@example.com`, password: 'securePassword123!' });
            }
            // The next request should be blocked
            const response = await (0, supertest_1.default)(app)
                .post('/register')
                .send({ email: 'blocked@example.com', password: 'securePassword123!' });
            expect(response.status).toBe(429);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
            expect(response.body.error.message).toContain('registration');
        });
    });
    describe('Refresh limiter integration', () => {
        let app;
        beforeEach(() => {
            app = (0, express_1.default)();
            app.use(express_1.default.json());
            app.post('/refresh', rate_limiter_1.refreshLimiter, (req, res) => {
                res.json({ success: true });
            });
        });
        it('should allow first refresh request', async () => {
            const response = await (0, supertest_1.default)(app).post('/refresh');
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
        it('should have a moderate limit (30 per minute)', () => {
            expect(constants_1.RATE_LIMIT_CONSTANTS.AUTH_REFRESH.MAX_REQUESTS).toBe(30);
        });
    });
    describe('CSRF token limiter integration', () => {
        let app;
        beforeEach(() => {
            app = (0, express_1.default)();
            app.use(express_1.default.json());
            app.get('/csrf-token', rate_limiter_1.csrfTokenLimiter, (req, res) => {
                res.json({ token: 'test-token' });
            });
        });
        it('should allow first CSRF token request', async () => {
            const response = await (0, supertest_1.default)(app).get('/csrf-token');
            expect(response.status).toBe(200);
            expect(response.body.token).toBe('test-token');
        });
        it('should have a moderate limit (60 per minute)', () => {
            expect(constants_1.RATE_LIMIT_CONSTANTS.AUTH_CSRF_TOKEN.MAX_REQUESTS).toBe(60);
        });
    });
    describe('Auth limiter integration', () => {
        let app;
        beforeEach(() => {
            app = (0, express_1.default)();
            app.use(express_1.default.json());
            app.post('/login', rate_limiter_1.authLimiter, (req, res) => {
                // Simulate a failed login (return 401)
                res.status(401).json({ success: false, error: 'Invalid credentials' });
            });
        });
        it('should allow first login attempt', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/login')
                .send({ email: 'test@example.com', password: 'wrongpassword' });
            expect(response.status).toBe(401);
        });
        it('should block after 5 failed login attempts', async () => {
            // Make 5 requests (the limit)
            for (let i = 0; i < constants_1.RATE_LIMIT_CONSTANTS.AUTH_LOGIN.MAX_REQUESTS; i++) {
                await (0, supertest_1.default)(app)
                    .post('/login')
                    .send({ email: 'test@example.com', password: 'wrongpassword' });
            }
            // The next request should be blocked
            const response = await (0, supertest_1.default)(app)
                .post('/login')
                .send({ email: 'test@example.com', password: 'wrongpassword' });
            expect(response.status).toBe(429);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
            expect(response.body.error.message).toContain('login');
        });
    });
    describe('General limiter integration', () => {
        let app;
        beforeEach(() => {
            app = (0, express_1.default)();
            app.use(express_1.default.json());
            app.get('/test', rate_limiter_1.generalLimiter, (req, res) => {
                res.json({ success: true });
            });
        });
        it('should allow requests within the rate limit', async () => {
            const response = await (0, supertest_1.default)(app).get('/test');
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
        it('should have standard headers enabled', async () => {
            const response = await (0, supertest_1.default)(app).get('/test');
            expect(response.headers['ratelimit-limit']).toBeDefined();
            expect(response.headers['ratelimit-remaining']).toBeDefined();
        });
    });
});
