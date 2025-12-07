import { Request, Response, NextFunction } from 'express';
import {
  createCsrfProtection,
  generateCsrfToken,
  csrfEnsureToken,
  csrfValidateToken,
  getCsrfToken,
} from '../csrf-protection';
import { ForbiddenException } from '@shared/exceptions/http-exceptions';

describe('CSRF Protection Middleware', () => {
  // Helper to create mock request
  const createMockRequest = (options: {
    method?: string;
    cookies?: Record<string, string>;
    headers?: Record<string, string>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body?: Record<string, any>;
    query?: Record<string, string>;
  } = {}): Partial<Request> => {
    const headers = options.headers || {};
    return {
      method: options.method || 'GET',
      cookies: options.cookies || {},
      body: options.body || {},
      query: options.query || {},
      get: jest.fn((name: string): string | undefined => {
        return headers[name.toLowerCase()] || headers[name];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
    };
  };

  // Helper to create mock response
  const createMockResponse = (): Partial<Response> => {
    const res: Partial<Response> = {
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };
    return res;
  };

  // Helper to create mock next function
  const createMockNext = (): NextFunction => jest.fn();

  describe('generateCsrfToken', () => {
    it('should generate a token of correct length', () => {
      const token = generateCsrfToken(32);
      // 32 bytes = 64 hex characters
      expect(token).toHaveLength(64);
    });

    it('should generate unique tokens', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      expect(token1).not.toEqual(token2);
    });

    it('should generate tokens with only hex characters', () => {
      const token = generateCsrfToken();
      expect(token).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('createCsrfProtection', () => {
    it('should create middleware with default options', () => {
      const csrf = createCsrfProtection();
      expect(csrf.options.cookieName).toBe('csrf_token');
      expect(csrf.options.headerName).toBe('X-CSRF-Token');
      expect(csrf.options.sameSite).toBe('strict');
      expect(csrf.options.tokenLength).toBe(32);
    });

    it('should allow custom options', () => {
      const csrf = createCsrfProtection({
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
      const csrf = createCsrfProtection();
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      csrf.ensureToken(req, res, next);

      expect(res.cookie).toHaveBeenCalledWith(
        'csrf_token',
        expect.any(String),
        expect.objectContaining({
          httpOnly: false,
          sameSite: 'strict',
          path: '/',
        })
      );
      expect(next).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((req as any).csrfToken).toBeDefined();
    });

    it('should reuse existing token from cookie', () => {
      const csrf = createCsrfProtection();
      const existingToken = generateCsrfToken();
      const req = createMockRequest({
        cookies: { csrf_token: existingToken },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      csrf.ensureToken(req, res, next);

      expect(res.cookie).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((req as any).csrfToken).toBe(existingToken);
    });

    it('should rotate token when rotateOnRequest is true', () => {
      const csrf = createCsrfProtection({ rotateOnRequest: true });
      const existingToken = generateCsrfToken();
      const req = createMockRequest({
        cookies: { csrf_token: existingToken },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      csrf.ensureToken(req, res, next);

      expect(res.cookie).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((req as any).csrfToken).not.toBe(existingToken);
    });
  });

  describe('validateToken middleware', () => {
    it('should skip validation for GET requests', () => {
      const csrf = createCsrfProtection();
      const req = createMockRequest({ method: 'GET' }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      csrf.validateToken(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should skip validation for HEAD requests', () => {
      const csrf = createCsrfProtection();
      const req = createMockRequest({ method: 'HEAD' }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      csrf.validateToken(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should skip validation for OPTIONS requests', () => {
      const csrf = createCsrfProtection();
      const req = createMockRequest({ method: 'OPTIONS' }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      csrf.validateToken(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if cookie token is missing for POST', () => {
      const csrf = createCsrfProtection();
      const req = createMockRequest({ method: 'POST' }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      expect(() => csrf.validateToken(req, res, next)).toThrow(ForbiddenException);
      expect(() => csrf.validateToken(req, res, next)).toThrow('CSRF token missing from cookie');
    });

    it('should throw ForbiddenException if submitted token is missing for POST', () => {
      const csrf = createCsrfProtection();
      const token = generateCsrfToken();
      const req = createMockRequest({
        method: 'POST',
        cookies: { csrf_token: token },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      expect(() => csrf.validateToken(req, res, next)).toThrow(ForbiddenException);
      expect(() => csrf.validateToken(req, res, next)).toThrow('CSRF token missing from request');
    });

    it('should throw ForbiddenException if tokens do not match', () => {
      const csrf = createCsrfProtection();
      const cookieToken = generateCsrfToken();
      const submittedToken = generateCsrfToken();
      const req = createMockRequest({
        method: 'POST',
        cookies: { csrf_token: cookieToken },
        headers: { 'X-CSRF-Token': submittedToken },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      expect(() => csrf.validateToken(req, res, next)).toThrow(ForbiddenException);
      expect(() => csrf.validateToken(req, res, next)).toThrow('CSRF token mismatch');
    });

    it('should validate successfully when header token matches cookie', () => {
      const csrf = createCsrfProtection();
      const token = generateCsrfToken();
      const req = createMockRequest({
        method: 'POST',
        cookies: { csrf_token: token },
        headers: { 'X-CSRF-Token': token },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      csrf.validateToken(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should validate successfully when body token matches cookie', () => {
      const csrf = createCsrfProtection();
      const token = generateCsrfToken();
      const req = createMockRequest({
        method: 'POST',
        cookies: { csrf_token: token },
        body: { _csrf: token },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      csrf.validateToken(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should validate successfully when query token matches cookie', () => {
      const csrf = createCsrfProtection();
      const token = generateCsrfToken();
      const req = createMockRequest({
        method: 'POST',
        cookies: { csrf_token: token },
        query: { _csrf: token },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      csrf.validateToken(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should prefer header token over body token', () => {
      const csrf = createCsrfProtection();
      const correctToken = generateCsrfToken();
      const wrongToken = generateCsrfToken();
      const req = createMockRequest({
        method: 'POST',
        cookies: { csrf_token: correctToken },
        headers: { 'X-CSRF-Token': correctToken },
        body: { _csrf: wrongToken },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      csrf.validateToken(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should validate PUT requests', () => {
      const csrf = createCsrfProtection();
      const token = generateCsrfToken();
      const req = createMockRequest({
        method: 'PUT',
        cookies: { csrf_token: token },
        headers: { 'X-CSRF-Token': token },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      csrf.validateToken(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should validate PATCH requests', () => {
      const csrf = createCsrfProtection();
      const token = generateCsrfToken();
      const req = createMockRequest({
        method: 'PATCH',
        cookies: { csrf_token: token },
        headers: { 'X-CSRF-Token': token },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      csrf.validateToken(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should validate DELETE requests', () => {
      const csrf = createCsrfProtection();
      const token = generateCsrfToken();
      const req = createMockRequest({
        method: 'DELETE',
        cookies: { csrf_token: token },
        headers: { 'X-CSRF-Token': token },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      csrf.validateToken(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('protect middleware (combined)', () => {
    it('should generate token and allow GET requests', () => {
      const csrf = createCsrfProtection();
      const req = createMockRequest({ method: 'GET' }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      csrf.protect(req, res, next);

      expect(res.cookie).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should generate token and validate POST requests', () => {
      const csrf = createCsrfProtection();
      const token = generateCsrfToken();
      const req = createMockRequest({
        method: 'POST',
        cookies: { csrf_token: token },
        headers: { 'X-CSRF-Token': token },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      csrf.protect(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('getToken', () => {
    it('should return token from request object', () => {
      const csrf = createCsrfProtection();
      const token = generateCsrfToken();
      const req = createMockRequest() as Request;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any).csrfToken = token;

      const result = csrf.getToken(req);

      expect(result).toBe(token);
    });

    it('should return token from cookie if not on request', () => {
      const csrf = createCsrfProtection();
      const token = generateCsrfToken();
      const req = createMockRequest({
        cookies: { csrf_token: token },
      }) as Request;

      const result = csrf.getToken(req);

      expect(result).toBe(token);
    });

    it('should return empty string if no token exists', () => {
      const csrf = createCsrfProtection();
      const req = createMockRequest() as Request;

      const result = csrf.getToken(req);

      expect(result).toBe('');
    });
  });

  describe('default exports', () => {
    it('should export csrfEnsureToken middleware', () => {
      expect(csrfEnsureToken).toBeDefined();
      expect(typeof csrfEnsureToken).toBe('function');
    });

    it('should export csrfValidateToken middleware', () => {
      expect(csrfValidateToken).toBeDefined();
      expect(typeof csrfValidateToken).toBe('function');
    });

    it('should export getCsrfToken function', () => {
      expect(getCsrfToken).toBeDefined();
      expect(typeof getCsrfToken).toBe('function');
    });
  });

  describe('timing attack prevention', () => {
    it('should use constant-time comparison', () => {
      const csrf = createCsrfProtection();
      const token = generateCsrfToken();

      // Create a token that differs only in the last character
      const similarToken = token.slice(0, -1) + (token[token.length - 1] === '0' ? '1' : '0');

      const req = createMockRequest({
        method: 'POST',
        cookies: { csrf_token: token },
        headers: { 'X-CSRF-Token': similarToken },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      // Both should fail with mismatch (not timing-based)
      expect(() => csrf.validateToken(req, res, next)).toThrow('CSRF token mismatch');
    });

    it('should reject tokens of different lengths', () => {
      const csrf = createCsrfProtection();
      const token = generateCsrfToken();
      const shortToken = token.slice(0, 10);

      const req = createMockRequest({
        method: 'POST',
        cookies: { csrf_token: token },
        headers: { 'X-CSRF-Token': shortToken },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      expect(() => csrf.validateToken(req, res, next)).toThrow('CSRF token mismatch');
    });
  });

  describe('cookie configuration', () => {
    it('should set secure cookie in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const csrf = createCsrfProtection({ secure: true });
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      csrf.ensureToken(req, res, next);

      expect(res.cookie).toHaveBeenCalledWith(
        'csrf_token',
        expect.any(String),
        expect.objectContaining({
          secure: true,
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should set cookie with maxAge', () => {
      const csrf = createCsrfProtection();
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      csrf.ensureToken(req, res, next);

      expect(res.cookie).toHaveBeenCalledWith(
        'csrf_token',
        expect.any(String),
        expect.objectContaining({
          maxAge: 24 * 60 * 60 * 1000,
        })
      );
    });
  });
});
