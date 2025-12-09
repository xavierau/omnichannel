"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const tsyringe_1 = require("tsyringe");
const auth_service_1 = require("./auth.service");
const user_service_1 = require("../users/user.service");
const async_handler_1 = require("../../middleware/async-handler");
const http_exceptions_1 = require("../../shared/exceptions/http-exceptions");
const logger_config_1 = require("../../config/logger.config");
/**
 * Generic error messages for authentication endpoints.
 * Using consistent messages prevents account enumeration attacks.
 */
const AUTH_ERROR_MESSAGES = {
    REGISTRATION_FAILED: 'Registration failed. Please check your input and try again.',
    INVALID_CREDENTIALS: 'Invalid email or password',
    PASSWORD_RESET_FAILED: 'Password reset failed. Please try again.',
};
let AuthController = class AuthController {
    authService;
    userService;
    constructor(authService, userService) {
        this.authService = authService;
        this.userService = userService;
    }
    /**
     * Register a new user.
     *
     * Security: Returns generic error messages to prevent account enumeration.
     * Attackers cannot determine if an email is already registered based on
     * error messages or response timing.
     */
    register = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { email, password, firstName, lastName, companyName } = req.body;
        try {
            const user = await this.authService.register({
                email,
                password,
                firstName,
                lastName,
                companyName,
            });
            res.status(201).json({
                data: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    status: user.status,
                },
            });
        }
        catch (error) {
            // Log the actual error for debugging/monitoring
            logger_config_1.auditLogger.warn('Registration error', {
                email,
                errorType: error.constructor.name,
                // Do NOT log the password or detailed error message
            });
            // WeakPasswordException gets its own message (already generic)
            if (error instanceof http_exceptions_1.WeakPasswordException) {
                return res.status(400).json({
                    statusCode: 400,
                    message: error.message,
                });
            }
            // All other errors return generic message to prevent enumeration
            // This includes: email already exists, database errors, etc.
            return res.status(400).json({
                statusCode: 400,
                message: AUTH_ERROR_MESSAGES.REGISTRATION_FAILED,
            });
        }
    });
    login = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const user = req.user;
        const ipAddress = req.ip || '';
        const userAgent = req.get('user-agent') || '';
        const { accessToken, refreshToken } = await this.authService.login(user, ipAddress, userAgent);
        // Set httpOnly cookie for refresh token
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        const permissions = await this.userService.getUserPermissions(user.id);
        res.json({
            data: {
                accessToken,
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    status: user.status,
                    emailVerified: user.emailVerified,
                    roles: user.roles.map((r) => ({
                        id: r.id,
                        name: r.name,
                        displayName: r.displayName,
                    })),
                    permissions,
                },
            },
        });
    });
    refresh = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({
                statusCode: 401,
                message: 'No refresh token provided',
            });
        }
        try {
            const ipAddress = req.ip || '';
            const userAgent = req.get('user-agent') || '';
            // Token rotation: refreshAccessToken now returns both tokens
            const { accessToken, refreshToken: newRefreshToken } = await this.authService.refreshAccessToken(refreshToken, ipAddress, userAgent);
            // Set new httpOnly cookie with rotated refresh token
            res.cookie('refreshToken', newRefreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });
            res.json({
                data: {
                    accessToken,
                },
            });
        }
        catch {
            res.clearCookie('refreshToken');
            return res.status(401).json({
                statusCode: 401,
                message: 'Invalid refresh token',
            });
        }
    });
    logout = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const refreshToken = req.cookies.refreshToken;
        const user = req.user;
        if (refreshToken) {
            try {
                await this.authService.logout(refreshToken, user?.id);
            }
            catch {
                // Ignore errors during logout
            }
        }
        res.clearCookie('refreshToken');
        res.status(204).send();
    });
    getMe = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const user = req.user;
        const permissions = await this.userService.getUserPermissions(user.id);
        res.json({
            data: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                status: user.status,
                emailVerified: user.emailVerified,
                roles: user.roles.map((r) => ({
                    id: r.id,
                    name: r.name,
                    displayName: r.displayName,
                })),
                permissions,
            },
        });
    });
    /**
     * Request a password reset email.
     *
     * Security: Always returns success to prevent email enumeration.
     * If email exists and user is active, a reset token will be generated.
     * In production, an email would be sent with the reset link.
     */
    forgotPassword = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { email } = req.body;
        const result = await this.authService.requestPasswordReset(email);
        // Log the request (but never log the token in production)
        logger_config_1.auditLogger.info('Password reset requested', { email });
        // In development, include the token for testing purposes
        // In production, this would NEVER include the token
        const responseData = {
            message: result.message,
        };
        if (process.env.NODE_ENV !== 'production' && result.token) {
            responseData.token = result.token;
        }
        res.status(200).json({
            data: responseData,
        });
    });
    /**
     * Reset password using the provided token.
     *
     * Security:
     * - Token is validated using constant-time comparison
     * - Token is invalidated after successful use
     * - All sessions are terminated after password change
     */
    resetPassword = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { email, token, newPassword } = req.body;
        try {
            const result = await this.authService.resetPassword(email, token, newPassword);
            logger_config_1.auditLogger.info('Password reset completed', { email });
            res.status(200).json({
                data: {
                    message: result.message,
                },
            });
        }
        catch (error) {
            // Log the actual error for debugging
            logger_config_1.auditLogger.warn('Password reset failed', {
                email,
                errorType: error.constructor.name,
            });
            // WeakPasswordException gets its own message
            if (error instanceof http_exceptions_1.WeakPasswordException) {
                return res.status(400).json({
                    statusCode: 400,
                    message: error.message,
                });
            }
            // BadRequestException from AuthService (invalid token)
            if (error instanceof http_exceptions_1.BadRequestException) {
                return res.status(400).json({
                    statusCode: 400,
                    message: error.message,
                });
            }
            // Generic error for other cases
            return res.status(400).json({
                statusCode: 400,
                message: AUTH_ERROR_MESSAGES.PASSWORD_RESET_FAILED,
            });
        }
    });
};
exports.AuthController = AuthController;
exports.AuthController = AuthController = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(auth_service_1.AuthService)),
    __param(1, (0, tsyringe_1.inject)(user_service_1.UserService)),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        user_service_1.UserService])
], AuthController);
