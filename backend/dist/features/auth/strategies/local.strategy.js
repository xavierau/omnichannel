"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStrategy = void 0;
const passport_local_1 = require("passport-local");
const tsyringe_1 = require("tsyringe");
const auth_service_1 = require("../auth.service");
const user_service_1 = require("../../users/user.service");
const constants_1 = require("../../../config/constants");
const logger_config_1 = require("../../../config/logger.config");
class LocalStrategy extends passport_local_1.Strategy {
    constructor() {
        super({
            usernameField: 'email',
            passwordField: 'password',
        }, async (email, password, done) => {
            try {
                const authService = tsyringe_1.container.resolve(auth_service_1.AuthService);
                const userService = tsyringe_1.container.resolve(user_service_1.UserService);
                // Get user first to check lockout status
                const user = await userService.findByEmail(email);
                if (!user) {
                    logger_config_1.auditLogger.warn('Login attempt for non-existent user', { email });
                    return done(null, false, { message: 'Invalid email or password' });
                }
                // Check if account is locked
                if (user.lockedUntil && user.lockedUntil > new Date()) {
                    const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
                    logger_config_1.auditLogger.warn('Login attempt on locked account', {
                        userId: user.id,
                        email: user.email,
                        remainingMinutes,
                    });
                    return done(null, false, {
                        message: `Account is locked. Try again in ${remainingMinutes} minute(s)`,
                    });
                }
                // Validate credentials
                const validatedUser = await authService.validateCredentials(email, password);
                if (!validatedUser) {
                    // Increment failed login attempts
                    user.failedLoginAttempts += 1;
                    // Lock account if max attempts reached
                    if (user.failedLoginAttempts >= constants_1.AUTH_CONSTANTS.MAX_LOGIN_ATTEMPTS) {
                        user.lockedUntil = new Date(Date.now() + constants_1.AUTH_CONSTANTS.LOCKOUT_DURATION_MS);
                        const lockMinutes = constants_1.AUTH_CONSTANTS.LOCKOUT_DURATION_MS / 60000;
                        logger_config_1.auditLogger.warn('Account locked due to too many failed attempts', {
                            userId: user.id,
                            email: user.email,
                            failedAttempts: user.failedLoginAttempts,
                            lockedUntil: user.lockedUntil,
                        });
                        await userService.updateUser(user.id, {
                            failedLoginAttempts: user.failedLoginAttempts,
                            lockedUntil: user.lockedUntil,
                        });
                        return done(null, false, {
                            message: `Too many failed login attempts. Account locked for ${lockMinutes} minutes`,
                        });
                    }
                    // Save failed attempt count
                    await userService.updateUser(user.id, {
                        failedLoginAttempts: user.failedLoginAttempts,
                    });
                    logger_config_1.auditLogger.warn('Failed login attempt', {
                        userId: user.id,
                        email: user.email,
                        failedAttempts: user.failedLoginAttempts,
                    });
                    return done(null, false, { message: 'Invalid email or password' });
                }
                // Check if account is active
                if (validatedUser.status !== 'active') {
                    logger_config_1.auditLogger.warn('Login attempt on inactive account', {
                        userId: validatedUser.id,
                        email: validatedUser.email,
                        status: validatedUser.status,
                    });
                    return done(null, false, { message: 'Account is not active' });
                }
                // Reset failed login attempts on successful login
                if (validatedUser.failedLoginAttempts > 0) {
                    await userService.updateUser(validatedUser.id, {
                        failedLoginAttempts: 0,
                        lockedUntil: null,
                    });
                }
                return done(null, validatedUser);
            }
            catch (error) {
                logger_config_1.auditLogger.error('Error during local strategy authentication', {
                    email,
                    error: error.message,
                });
                return done(error);
            }
        });
    }
}
exports.LocalStrategy = LocalStrategy;
