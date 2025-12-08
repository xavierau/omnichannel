import { Application } from 'express';
/**
 * Creates and configures the Express application
 *
 * Security Features:
 * - Helmet: Security headers (CSP, X-Frame-Options, etc.)
 * - CORS: Cross-Origin Resource Sharing with credentials
 * - Rate Limiting: Global and per-route limits
 * - CSRF Protection: Double-submit cookie pattern for state-changing routes
 *
 * CSRF Protection Notes:
 * - CSRF tokens are obtained via GET /api/auth/csrf-token
 * - Tokens must be included in X-CSRF-Token header for POST/PUT/PATCH/DELETE
 * - Login and Register routes are exempt (no existing session)
 * - See auth.routes.ts and user.routes.ts for protected routes
 */
export declare function createApp(): Application;
