export declare class PasswordService {
    /**
     * Hash a password using Argon2id
     */
    hashPassword(password: string): Promise<string>;
    /**
     * Verify a password against its hash
     */
    verifyPassword(hash: string, password: string): Promise<boolean>;
    /**
     * Generic error message for password validation failures.
     * Using a single message prevents attackers from learning which specific
     * rule failed, which could be used to enumerate valid passwords faster.
     */
    private static readonly GENERIC_PASSWORD_ERROR;
    /**
     * Validate password strength.
     *
     * Security consideration: All validation rules are checked, and a single
     * generic error message is returned to prevent attackers from learning
     * which specific rule failed. This prevents incremental password crafting attacks.
     */
    private validatePasswordStrength;
}
