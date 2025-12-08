import { Request, Response, NextFunction } from 'express';
/**
 * CSRF Protection Middleware using Double-Submit Cookie Pattern
 *
 * How it works:
 * 1. Server generates a random token and sends it as both:
 *    - A cookie (csrf_token) - automatically sent with requests
 *    - Available via /api/auth/csrf-token endpoint for SPA clients
 * 2. Client must include the token in requests as either:
 *    - X-CSRF-Token header (preferred for SPAs)
 *    - _csrf query parameter
 *    - _csrf body field
 * 3. Server validates that the submitted token matches the cookie token
 *
 * Security considerations:
 * - Cookie is SameSite=Strict to prevent cross-origin cookie inclusion
 * - Token is cryptographically random (32 bytes = 256 bits of entropy)
 * - Tokens are rotated on each request for additional security
 */
export interface CsrfOptions {
    /** Cookie name for CSRF token. Default: 'csrf_token' */
    cookieName?: string;
    /** Header name for CSRF token. Default: 'X-CSRF-Token' */
    headerName?: string;
    /** Whether to use secure cookies (HTTPS only). Default: true in production */
    secure?: boolean;
    /** SameSite cookie attribute. Default: 'strict' */
    sameSite?: 'strict' | 'lax' | 'none';
    /** Token byte length. Default: 32 (256 bits) */
    tokenLength?: number;
    /** Cookie path. Default: '/' */
    path?: string;
    /** Whether to rotate token on each request. Default: false */
    rotateOnRequest?: boolean;
}
/**
 * Generates a cryptographically secure CSRF token
 */
export declare function generateCsrfToken(length?: number): string;
/**
 * Creates a CSRF protection middleware with the given options
 */
export declare function createCsrfProtection(userOptions?: CsrfOptions): {
    ensureToken: (req: Request, res: Response, next: NextFunction) => void;
    validateToken: (req: Request, res: Response, next: NextFunction) => void;
    protect: (req: Request, res: Response, next: NextFunction) => void;
    getToken: (req: Request) => string;
    options: Required<CsrfOptions>;
};
declare const defaultCsrf: {
    ensureToken: (req: Request, res: Response, next: NextFunction) => void;
    validateToken: (req: Request, res: Response, next: NextFunction) => void;
    protect: (req: Request, res: Response, next: NextFunction) => void;
    getToken: (req: Request) => string;
    options: Required<CsrfOptions>;
};
export declare const csrfEnsureToken: (req: Request, res: Response, next: NextFunction) => void;
export declare const csrfValidateToken: (req: Request, res: Response, next: NextFunction) => void;
export declare const csrfProtect: (req: Request, res: Response, next: NextFunction) => void;
export declare const getCsrfToken: (req: Request) => string;
export default defaultCsrf;
