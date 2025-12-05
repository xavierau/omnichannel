import { Strategy as PassportLocalStrategy } from 'passport-local';
import { container } from 'tsyringe';
import { AuthService } from '../auth.service';
import { UserService } from '@features/users/user.service';
import { AUTH_CONSTANTS } from '@config/constants';
import { auditLogger } from '@config/logger.config';

export class LocalStrategy extends PassportLocalStrategy {
  constructor() {
    super(
      {
        usernameField: 'email',
        passwordField: 'password',
      },
      async (email: string, password: string, done) => {
        try {
          const authService = container.resolve(AuthService);
          const userService = container.resolve(UserService);

          // Get user first to check lockout status
          const user = await userService.findByEmail(email);

          if (!user) {
            auditLogger.warn('Login attempt for non-existent user', { email });
            return done(null, false, { message: 'Invalid email or password' });
          }

          // Check if account is locked
          if (user.lockedUntil && user.lockedUntil > new Date()) {
            const remainingMinutes = Math.ceil(
              (user.lockedUntil.getTime() - Date.now()) / 60000
            );
            auditLogger.warn('Login attempt on locked account', {
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
            if (user.failedLoginAttempts >= AUTH_CONSTANTS.MAX_LOGIN_ATTEMPTS) {
              user.lockedUntil = new Date(Date.now() + AUTH_CONSTANTS.LOCKOUT_DURATION_MS);
              const lockMinutes = AUTH_CONSTANTS.LOCKOUT_DURATION_MS / 60000;

              auditLogger.warn('Account locked due to too many failed attempts', {
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

            auditLogger.warn('Failed login attempt', {
              userId: user.id,
              email: user.email,
              failedAttempts: user.failedLoginAttempts,
            });

            return done(null, false, { message: 'Invalid email or password' });
          }

          // Check if account is active
          if (validatedUser.status !== 'active') {
            auditLogger.warn('Login attempt on inactive account', {
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
        } catch (error) {
          auditLogger.error('Error during local strategy authentication', {
            email,
            error: (error as Error).message,
          });
          return done(error);
        }
      }
    );
  }
}
