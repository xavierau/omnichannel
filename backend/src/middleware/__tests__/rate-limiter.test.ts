import express from 'express';
import request from 'supertest';
import {
  generalLimiter,
  authLimiter,
  registerLimiter,
  passwordResetLimiter,
  refreshLimiter,
  csrfTokenLimiter,
} from '../rate-limiter';
import { RATE_LIMIT_CONSTANTS } from '@config/constants';

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
      expect(RATE_LIMIT_CONSTANTS.GENERAL.WINDOW_MS).toBe(60 * 1000);
      expect(RATE_LIMIT_CONSTANTS.GENERAL.MAX_REQUESTS).toBe(100);
    });

    it('should have correct auth login rate limit values', () => {
      expect(RATE_LIMIT_CONSTANTS.AUTH_LOGIN.WINDOW_MS).toBe(60 * 1000);
      expect(RATE_LIMIT_CONSTANTS.AUTH_LOGIN.MAX_REQUESTS).toBe(5);
      expect(RATE_LIMIT_CONSTANTS.AUTH_LOGIN.SKIP_SUCCESSFUL).toBe(true);
    });

    it('should have correct registration rate limit values', () => {
      expect(RATE_LIMIT_CONSTANTS.AUTH_REGISTER.WINDOW_MS).toBe(60 * 60 * 1000);
      expect(RATE_LIMIT_CONSTANTS.AUTH_REGISTER.MAX_REQUESTS).toBe(5);
    });

    it('should have correct password reset rate limit values', () => {
      expect(RATE_LIMIT_CONSTANTS.AUTH_PASSWORD_RESET.WINDOW_MS).toBe(
        60 * 60 * 1000
      );
      expect(RATE_LIMIT_CONSTANTS.AUTH_PASSWORD_RESET.MAX_REQUESTS).toBe(3);
    });

    it('should have correct refresh rate limit values', () => {
      expect(RATE_LIMIT_CONSTANTS.AUTH_REFRESH.WINDOW_MS).toBe(60 * 1000);
      expect(RATE_LIMIT_CONSTANTS.AUTH_REFRESH.MAX_REQUESTS).toBe(30);
    });

    it('should have correct CSRF token rate limit values', () => {
      expect(RATE_LIMIT_CONSTANTS.AUTH_CSRF_TOKEN.WINDOW_MS).toBe(60 * 1000);
      expect(RATE_LIMIT_CONSTANTS.AUTH_CSRF_TOKEN.MAX_REQUESTS).toBe(60);
    });
  });

  describe('Rate limit error response format', () => {
    it('all limiters should be express middleware functions', () => {
      const limiters = [
        generalLimiter,
        authLimiter,
        registerLimiter,
        passwordResetLimiter,
        refreshLimiter,
        csrfTokenLimiter,
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
      expect(RATE_LIMIT_CONSTANTS.AUTH_REGISTER.WINDOW_MS).toBeGreaterThanOrEqual(
        oneHourMs
      );
    });

    it('password reset window should be at least 1 hour', () => {
      const oneHourMs = 60 * 60 * 1000;
      expect(
        RATE_LIMIT_CONSTANTS.AUTH_PASSWORD_RESET.WINDOW_MS
      ).toBeGreaterThanOrEqual(oneHourMs);
    });

    it('login should have very strict limits to prevent brute force', () => {
      expect(RATE_LIMIT_CONSTANTS.AUTH_LOGIN.MAX_REQUESTS).toBeLessThanOrEqual(
        10
      );
    });

    it('registration should have very strict limits to prevent mass accounts', () => {
      expect(
        RATE_LIMIT_CONSTANTS.AUTH_REGISTER.MAX_REQUESTS
      ).toBeLessThanOrEqual(10);
    });

    it('password reset should have strictest limits to prevent enumeration', () => {
      expect(
        RATE_LIMIT_CONSTANTS.AUTH_PASSWORD_RESET.MAX_REQUESTS
      ).toBeLessThanOrEqual(5);
    });
  });

  describe('Password reset limiter integration', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.post('/password-reset', passwordResetLimiter, (req, res) => {
        res.json({ success: true });
      });
    });

    it('should allow requests within the rate limit', async () => {
      const response = await request(app)
        .post('/password-reset')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should block requests after exceeding the rate limit', async () => {
      // Make 3 requests (the limit)
      for (let i = 0; i < RATE_LIMIT_CONSTANTS.AUTH_PASSWORD_RESET.MAX_REQUESTS; i++) {
        await request(app)
          .post('/password-reset')
          .send({ email: 'test@example.com' });
      }

      // The next request should be blocked
      const response = await request(app)
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
      const response = await request(app)
        .post('/password-reset')
        .send({ email: 'test@example.com' });

      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });
  });

  describe('Register limiter integration', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.post('/register', registerLimiter, (req, res) => {
        res.json({ success: true });
      });
    });

    it('should allow first registration request', async () => {
      const response = await request(app)
        .post('/register')
        .send({ email: 'test@example.com', password: 'securePassword123!' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should block after 5 registration attempts', async () => {
      // Make 5 requests (the limit)
      for (let i = 0; i < RATE_LIMIT_CONSTANTS.AUTH_REGISTER.MAX_REQUESTS; i++) {
        await request(app)
          .post('/register')
          .send({ email: `test${i}@example.com`, password: 'securePassword123!' });
      }

      // The next request should be blocked
      const response = await request(app)
        .post('/register')
        .send({ email: 'blocked@example.com', password: 'securePassword123!' });

      expect(response.status).toBe(429);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(response.body.error.message).toContain('registration');
    });
  });

  describe('Refresh limiter integration', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.post('/refresh', refreshLimiter, (req, res) => {
        res.json({ success: true });
      });
    });

    it('should allow first refresh request', async () => {
      const response = await request(app).post('/refresh');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should have a moderate limit (30 per minute)', () => {
      expect(RATE_LIMIT_CONSTANTS.AUTH_REFRESH.MAX_REQUESTS).toBe(30);
    });
  });

  describe('CSRF token limiter integration', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.get('/csrf-token', csrfTokenLimiter, (req, res) => {
        res.json({ token: 'test-token' });
      });
    });

    it('should allow first CSRF token request', async () => {
      const response = await request(app).get('/csrf-token');

      expect(response.status).toBe(200);
      expect(response.body.token).toBe('test-token');
    });

    it('should have a moderate limit (60 per minute)', () => {
      expect(RATE_LIMIT_CONSTANTS.AUTH_CSRF_TOKEN.MAX_REQUESTS).toBe(60);
    });
  });

  describe('Auth limiter integration', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.post('/login', authLimiter, (req, res) => {
        // Simulate a failed login (return 401)
        res.status(401).json({ success: false, error: 'Invalid credentials' });
      });
    });

    it('should allow first login attempt', async () => {
      const response = await request(app)
        .post('/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(response.status).toBe(401);
    });

    it('should block after 5 failed login attempts', async () => {
      // Make 5 requests (the limit)
      for (let i = 0; i < RATE_LIMIT_CONSTANTS.AUTH_LOGIN.MAX_REQUESTS; i++) {
        await request(app)
          .post('/login')
          .send({ email: 'test@example.com', password: 'wrongpassword' });
      }

      // The next request should be blocked
      const response = await request(app)
        .post('/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(response.status).toBe(429);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(response.body.error.message).toContain('login');
    });
  });

  describe('General limiter integration', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.get('/test', generalLimiter, (req, res) => {
        res.json({ success: true });
      });
    });

    it('should allow requests within the rate limit', async () => {
      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should have standard headers enabled', async () => {
      const response = await request(app).get('/test');

      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
    });
  });
});
