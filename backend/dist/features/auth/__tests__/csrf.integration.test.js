"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const csrf_protection_1 = require("../../../middleware/csrf-protection");
describe('CSRF Protection Integration Tests', () => {
    let app;
    beforeEach(() => {
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use((0, cookie_parser_1.default)());
    });
    describe('GET /csrf-token endpoint', () => {
        beforeEach(() => {
            app.get('/csrf-token', csrf_protection_1.csrfEnsureToken, (req, res) => {
                res.json({
                    data: {
                        csrfToken: (0, csrf_protection_1.getCsrfToken)(req),
                    },
                });
            });
        });
        it('should return a CSRF token and set cookie', async () => {
            const response = await (0, supertest_1.default)(app).get('/csrf-token').expect(200);
            expect(response.body.data.csrfToken).toBeDefined();
            expect(response.body.data.csrfToken).toHaveLength(64); // 32 bytes = 64 hex chars
            // Check cookie was set
            const cookies = response.headers['set-cookie'];
            expect(cookies).toBeDefined();
            expect(cookies[0]).toContain('csrf_token=');
            expect(cookies[0]).toContain('SameSite=Strict');
            expect(cookies[0]).toContain('Path=/');
        });
        it('should return same token on subsequent requests with cookie', async () => {
            // First request to get token
            const firstResponse = await (0, supertest_1.default)(app).get('/csrf-token').expect(200);
            const firstToken = firstResponse.body.data.csrfToken;
            // Extract cookie
            const cookies = firstResponse.headers['set-cookie'];
            const csrfCookie = cookies[0].split(';')[0];
            // Second request with cookie
            const secondResponse = await (0, supertest_1.default)(app)
                .get('/csrf-token')
                .set('Cookie', csrfCookie)
                .expect(200);
            expect(secondResponse.body.data.csrfToken).toBe(firstToken);
        });
    });
    describe('POST endpoint with CSRF protection', () => {
        beforeEach(() => {
            app.get('/csrf-token', csrf_protection_1.csrfEnsureToken, (req, res) => {
                res.json({ csrfToken: (0, csrf_protection_1.getCsrfToken)(req) });
            });
            app.post('/protected', csrf_protection_1.csrfValidateToken, (req, res) => {
                res.json({ success: true, data: req.body });
            });
            // Error handler
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
            app.use((err, req, res, _next) => {
                res.status(err.statusCode || 500).json({
                    statusCode: err.statusCode || 500,
                    message: err.message,
                });
            });
        });
        it('should reject POST without CSRF token', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/protected')
                .send({ data: 'test' })
                .expect(403);
            expect(response.body.message).toBe('CSRF token missing from cookie');
        });
        it('should reject POST with cookie but no header token', async () => {
            // Get CSRF token
            const tokenResponse = await (0, supertest_1.default)(app).get('/csrf-token').expect(200);
            const cookies = tokenResponse.headers['set-cookie'];
            const csrfCookie = cookies[0].split(';')[0];
            const response = await (0, supertest_1.default)(app)
                .post('/protected')
                .set('Cookie', csrfCookie)
                .send({ data: 'test' })
                .expect(403);
            expect(response.body.message).toBe('CSRF token missing from request');
        });
        it('should reject POST with mismatched tokens', async () => {
            // Get CSRF token
            const tokenResponse = await (0, supertest_1.default)(app).get('/csrf-token').expect(200);
            const cookies = tokenResponse.headers['set-cookie'];
            const csrfCookie = cookies[0].split(';')[0];
            const response = await (0, supertest_1.default)(app)
                .post('/protected')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', 'invalid-token')
                .send({ data: 'test' })
                .expect(403);
            expect(response.body.message).toBe('CSRF token mismatch');
        });
        it('should accept POST with valid CSRF token in header', async () => {
            // Get CSRF token
            const tokenResponse = await (0, supertest_1.default)(app).get('/csrf-token').expect(200);
            const csrfToken = tokenResponse.body.csrfToken;
            const cookies = tokenResponse.headers['set-cookie'];
            const csrfCookie = cookies[0].split(';')[0];
            const response = await (0, supertest_1.default)(app)
                .post('/protected')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .send({ data: 'test' })
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual({ data: 'test' });
        });
        it('should accept POST with valid CSRF token in body', async () => {
            // Get CSRF token
            const tokenResponse = await (0, supertest_1.default)(app).get('/csrf-token').expect(200);
            const csrfToken = tokenResponse.body.csrfToken;
            const cookies = tokenResponse.headers['set-cookie'];
            const csrfCookie = cookies[0].split(';')[0];
            const response = await (0, supertest_1.default)(app)
                .post('/protected')
                .set('Cookie', csrfCookie)
                .send({ data: 'test', _csrf: csrfToken })
                .expect(200);
            expect(response.body.success).toBe(true);
        });
        it('should accept POST with valid CSRF token in query', async () => {
            // Get CSRF token
            const tokenResponse = await (0, supertest_1.default)(app).get('/csrf-token').expect(200);
            const csrfToken = tokenResponse.body.csrfToken;
            const cookies = tokenResponse.headers['set-cookie'];
            const csrfCookie = cookies[0].split(';')[0];
            const response = await (0, supertest_1.default)(app)
                .post(`/protected?_csrf=${csrfToken}`)
                .set('Cookie', csrfCookie)
                .send({ data: 'test' })
                .expect(200);
            expect(response.body.success).toBe(true);
        });
    });
    describe('Multiple HTTP methods', () => {
        beforeEach(() => {
            app.get('/csrf-token', csrf_protection_1.csrfEnsureToken, (req, res) => {
                res.json({ csrfToken: (0, csrf_protection_1.getCsrfToken)(req) });
            });
            app.get('/resource', (req, res) => {
                res.json({ method: 'GET', success: true });
            });
            app.post('/resource', csrf_protection_1.csrfValidateToken, (req, res) => {
                res.json({ method: 'POST', success: true });
            });
            app.put('/resource', csrf_protection_1.csrfValidateToken, (req, res) => {
                res.json({ method: 'PUT', success: true });
            });
            app.patch('/resource', csrf_protection_1.csrfValidateToken, (req, res) => {
                res.json({ method: 'PATCH', success: true });
            });
            app.delete('/resource', csrf_protection_1.csrfValidateToken, (req, res) => {
                res.json({ method: 'DELETE', success: true });
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
            app.use((err, req, res, _next) => {
                res.status(err.statusCode || 500).json({ message: err.message });
            });
        });
        it('should allow GET without CSRF token', async () => {
            const response = await (0, supertest_1.default)(app).get('/resource').expect(200);
            expect(response.body.method).toBe('GET');
        });
        it('should require CSRF token for PUT', async () => {
            // Without token
            await (0, supertest_1.default)(app).put('/resource').expect(403);
            // With token
            const tokenResponse = await (0, supertest_1.default)(app).get('/csrf-token').expect(200);
            const csrfToken = tokenResponse.body.csrfToken;
            const cookies = tokenResponse.headers['set-cookie'];
            const csrfCookie = cookies[0].split(';')[0];
            const response = await (0, supertest_1.default)(app)
                .put('/resource')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .expect(200);
            expect(response.body.method).toBe('PUT');
        });
        it('should require CSRF token for PATCH', async () => {
            // Without token
            await (0, supertest_1.default)(app).patch('/resource').expect(403);
            // With token
            const tokenResponse = await (0, supertest_1.default)(app).get('/csrf-token').expect(200);
            const csrfToken = tokenResponse.body.csrfToken;
            const cookies = tokenResponse.headers['set-cookie'];
            const csrfCookie = cookies[0].split(';')[0];
            const response = await (0, supertest_1.default)(app)
                .patch('/resource')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .expect(200);
            expect(response.body.method).toBe('PATCH');
        });
        it('should require CSRF token for DELETE', async () => {
            // Without token
            await (0, supertest_1.default)(app).delete('/resource').expect(403);
            // With token
            const tokenResponse = await (0, supertest_1.default)(app).get('/csrf-token').expect(200);
            const csrfToken = tokenResponse.body.csrfToken;
            const cookies = tokenResponse.headers['set-cookie'];
            const csrfCookie = cookies[0].split(';')[0];
            const response = await (0, supertest_1.default)(app)
                .delete('/resource')
                .set('Cookie', csrfCookie)
                .set('X-CSRF-Token', csrfToken)
                .expect(200);
            expect(response.body.method).toBe('DELETE');
        });
    });
    describe('Custom options integration', () => {
        it('should work with custom cookie and header names', async () => {
            const csrf = (0, csrf_protection_1.createCsrfProtection)({
                cookieName: 'my_csrf_cookie',
                headerName: 'X-My-CSRF-Header',
            });
            app.get('/csrf-token', csrf.ensureToken, (req, res) => {
                res.json({ csrfToken: csrf.getToken(req) });
            });
            app.post('/protected', csrf.validateToken, (req, res) => {
                res.json({ success: true });
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
            app.use((err, req, res, _next) => {
                res.status(err.statusCode || 500).json({ message: err.message });
            });
            // Get token with custom cookie name
            const tokenResponse = await (0, supertest_1.default)(app).get('/csrf-token').expect(200);
            const csrfToken = tokenResponse.body.csrfToken;
            const cookies = tokenResponse.headers['set-cookie'];
            expect(cookies[0]).toContain('my_csrf_cookie=');
            const csrfCookie = cookies[0].split(';')[0];
            // Use token with custom header name
            const response = await (0, supertest_1.default)(app)
                .post('/protected')
                .set('Cookie', csrfCookie)
                .set('X-My-CSRF-Header', csrfToken)
                .expect(200);
            expect(response.body.success).toBe(true);
        });
    });
    describe('Token rotation', () => {
        it('should rotate token when rotateOnRequest is enabled', async () => {
            const csrf = (0, csrf_protection_1.createCsrfProtection)({ rotateOnRequest: true });
            app.get('/csrf-token', csrf.ensureToken, (req, res) => {
                res.json({ csrfToken: csrf.getToken(req) });
            });
            // First request
            const firstResponse = await (0, supertest_1.default)(app).get('/csrf-token').expect(200);
            const firstToken = firstResponse.body.csrfToken;
            const firstCookies = firstResponse.headers['set-cookie'];
            const firstCookie = firstCookies[0].split(';')[0];
            // Second request with existing cookie - should get new token
            const secondResponse = await (0, supertest_1.default)(app)
                .get('/csrf-token')
                .set('Cookie', firstCookie)
                .expect(200);
            const secondToken = secondResponse.body.csrfToken;
            // Tokens should be different due to rotation
            expect(secondToken).not.toBe(firstToken);
        });
    });
    describe('Concurrent requests', () => {
        it('should handle concurrent requests correctly', async () => {
            app.get('/csrf-token', csrf_protection_1.csrfEnsureToken, (req, res) => {
                res.json({ csrfToken: (0, csrf_protection_1.getCsrfToken)(req) });
            });
            app.post('/protected', csrf_protection_1.csrfValidateToken, (req, res) => {
                res.json({ success: true, id: req.body.id });
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
            app.use((err, req, res, _next) => {
                res.status(err.statusCode || 500).json({ message: err.message });
            });
            // Get token
            const tokenResponse = await (0, supertest_1.default)(app).get('/csrf-token').expect(200);
            const csrfToken = tokenResponse.body.csrfToken;
            const cookies = tokenResponse.headers['set-cookie'];
            const csrfCookie = cookies[0].split(';')[0];
            // Make concurrent requests
            const results = await Promise.all([
                (0, supertest_1.default)(app)
                    .post('/protected')
                    .set('Cookie', csrfCookie)
                    .set('X-CSRF-Token', csrfToken)
                    .send({ id: 1 }),
                (0, supertest_1.default)(app)
                    .post('/protected')
                    .set('Cookie', csrfCookie)
                    .set('X-CSRF-Token', csrfToken)
                    .send({ id: 2 }),
                (0, supertest_1.default)(app)
                    .post('/protected')
                    .set('Cookie', csrfCookie)
                    .set('X-CSRF-Token', csrfToken)
                    .send({ id: 3 }),
            ]);
            // All requests should succeed
            results.forEach((response, index) => {
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.id).toBe(index + 1);
            });
        });
    });
});
