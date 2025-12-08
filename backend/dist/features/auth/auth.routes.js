"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tsyringe_1 = require("tsyringe");
const passport_1 = __importDefault(require("passport"));
const auth_controller_1 = require("./auth.controller");
const authenticate_1 = require("@middleware/authenticate");
const rate_limiter_1 = require("@middleware/rate-limiter");
const validate_dto_1 = require("@middleware/validate-dto");
const register_dto_1 = require("./dto/register.dto");
const login_dto_1 = require("./dto/login.dto");
const forgot_password_dto_1 = require("./dto/forgot-password.dto");
const reset_password_dto_1 = require("./dto/reset-password.dto");
const csrf_protection_1 = require("@middleware/csrf-protection");
const router = (0, express_1.Router)();
const controller = tsyringe_1.container.resolve(auth_controller_1.AuthController);
/**
 * CSRF Token Endpoint
 * GET /api/auth/csrf-token
 *
 * Returns a CSRF token for SPA clients.
 * The token is also set as a cookie.
 * Call this endpoint before making state-changing requests.
 *
 * Rate limit: 60 requests per minute per IP
 */
router.get('/csrf-token', rate_limiter_1.csrfTokenLimiter, csrf_protection_1.csrfEnsureToken, (req, res) => {
    res.json({
        data: {
            csrfToken: (0, csrf_protection_1.getCsrfToken)(req),
        },
    });
});
/**
 * Register new user
 * POST /api/auth/register
 *
 * CSRF protection is NOT applied here because:
 * - Registration is a public endpoint
 * - The user doesn't have a session/token yet
 * - Rate limiting provides protection against abuse
 *
 * Rate limit: 5 requests per hour per IP (prevents mass account creation)
 */
router.post('/register', rate_limiter_1.registerLimiter, (0, validate_dto_1.validateDto)(register_dto_1.RegisterDto), controller.register);
/**
 * Login with email and password
 * POST /api/auth/login
 *
 * CSRF protection is NOT applied here because:
 * - Login is an authentication endpoint that establishes the session
 * - The user doesn't have a valid CSRF token yet
 * - Rate limiting (authLimiter) provides protection against brute force
 *
 * After successful login, the client should fetch a CSRF token
 * via GET /api/auth/csrf-token
 *
 * Rate limit: 5 requests per minute per IP (skips successful requests)
 */
router.post('/login', rate_limiter_1.authLimiter, (0, validate_dto_1.validateDto)(login_dto_1.LoginDto), passport_1.default.authenticate('local', { session: false }), controller.login);
/**
 * Refresh access token using refresh token from cookie
 * POST /api/auth/refresh
 *
 * CSRF protection IS applied here because:
 * - This is a state-changing operation (token rotation)
 * - The user has an active session (refresh token in cookie)
 * - Attacker could exploit this to maintain access
 *
 * Rate limit: 30 requests per minute per IP
 */
router.post('/refresh', rate_limiter_1.refreshLimiter, csrf_protection_1.csrfValidateToken, controller.refresh);
/**
 * Logout (revoke refresh token)
 * POST /api/auth/logout
 *
 * CSRF protection IS applied here because:
 * - This is a state-changing operation
 * - We want to prevent attackers from logging users out
 * - The user has an active session
 *
 * Note: No specific rate limiter - logout should always be accessible
 */
router.post('/logout', csrf_protection_1.csrfValidateToken, controller.logout);
/**
 * Get current user profile
 * GET /api/auth/me
 *
 * CSRF protection is not needed for GET requests
 * (safe method that doesn't change state)
 */
router.get('/me', authenticate_1.authenticate, controller.getMe);
/**
 * Request password reset
 * POST /api/auth/forgot-password
 *
 * CSRF protection is NOT applied here because:
 * - This is a public endpoint for users who forgot their password
 * - The user doesn't have a session/token yet
 * - Rate limiting provides protection against abuse
 * - Always returns the same response to prevent email enumeration
 *
 * Rate limit: 3 requests per hour per IP (strict to prevent abuse)
 */
router.post('/forgot-password', rate_limiter_1.passwordResetLimiter, (0, validate_dto_1.validateDto)(forgot_password_dto_1.ForgotPasswordDto), controller.forgotPassword);
/**
 * Reset password with token
 * POST /api/auth/reset-password
 *
 * CSRF protection is NOT applied here because:
 * - This is a public endpoint using token-based authentication
 * - The reset token itself serves as proof of authorization
 * - Rate limiting provides protection against brute force
 *
 * Rate limit: 3 requests per hour per IP (strict to prevent token brute force)
 */
router.post('/reset-password', rate_limiter_1.passwordResetLimiter, (0, validate_dto_1.validateDto)(reset_password_dto_1.ResetPasswordDto), controller.resetPassword);
exports.default = router;
