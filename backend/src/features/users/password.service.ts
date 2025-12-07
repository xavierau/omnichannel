import { singleton } from 'tsyringe';
import * as argon2 from 'argon2';
import { AUTH_CONSTANTS } from '@config/constants';
import { WeakPasswordException } from '@shared/exceptions/http-exceptions';

@singleton()
export class PasswordService {
  /**
   * Hash a password using Argon2id
   */
  async hashPassword(password: string): Promise<string> {
    this.validatePasswordStrength(password);
    return argon2.hash(password);
  }

  /**
   * Verify a password against its hash
   */
  async verifyPassword(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  /**
   * Generic error message for password validation failures.
   * Using a single message prevents attackers from learning which specific
   * rule failed, which could be used to enumerate valid passwords faster.
   */
  private static readonly GENERIC_PASSWORD_ERROR =
    'Password does not meet security requirements. ' +
    'Must be 8-128 characters with uppercase, lowercase, number, and special character.';

  /**
   * Validate password strength.
   *
   * Security consideration: All validation rules are checked, and a single
   * generic error message is returned to prevent attackers from learning
   * which specific rule failed. This prevents incremental password crafting attacks.
   */
  private validatePasswordStrength(password: string): void {
    const violations: string[] = [];

    // Check all rules and collect violations (for logging only)
    if (password.length < AUTH_CONSTANTS.MIN_PASSWORD_LENGTH) {
      violations.push('too_short');
    }

    if (password.length > AUTH_CONSTANTS.MAX_PASSWORD_LENGTH) {
      violations.push('too_long');
    }

    if (!/[A-Z]/.test(password)) {
      violations.push('missing_uppercase');
    }

    if (!/[a-z]/.test(password)) {
      violations.push('missing_lowercase');
    }

    if (!/[0-9]/.test(password)) {
      violations.push('missing_number');
    }

    if (!/[@$!%*?&#^()_+=-]/.test(password)) {
      violations.push('missing_special');
    }

    // Check against common passwords
    const lowerPassword = password.toLowerCase();
    for (const commonPassword of AUTH_CONSTANTS.COMMON_PASSWORDS) {
      if (lowerPassword.includes(commonPassword.toLowerCase())) {
        violations.push('common_password');
        break;
      }
    }

    // Throw generic error if any violations exist
    if (violations.length > 0) {
      // Note: Do NOT include violations in the error message
      // They are collected here only for potential internal logging/metrics
      throw new WeakPasswordException(PasswordService.GENERIC_PASSWORD_ERROR);
    }
  }
}
