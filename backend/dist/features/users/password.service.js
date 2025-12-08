"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var PasswordService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordService = void 0;
const tsyringe_1 = require("tsyringe");
const argon2 = __importStar(require("argon2"));
const constants_1 = require("@config/constants");
const http_exceptions_1 = require("@shared/exceptions/http-exceptions");
let PasswordService = class PasswordService {
    static { PasswordService_1 = this; }
    /**
     * Hash a password using Argon2id
     */
    async hashPassword(password) {
        this.validatePasswordStrength(password);
        return argon2.hash(password);
    }
    /**
     * Verify a password against its hash
     */
    async verifyPassword(hash, password) {
        try {
            return await argon2.verify(hash, password);
        }
        catch {
            return false;
        }
    }
    /**
     * Generic error message for password validation failures.
     * Using a single message prevents attackers from learning which specific
     * rule failed, which could be used to enumerate valid passwords faster.
     */
    static GENERIC_PASSWORD_ERROR = 'Password does not meet security requirements. ' +
        'Must be 8-128 characters with uppercase, lowercase, number, and special character.';
    /**
     * Validate password strength.
     *
     * Security consideration: All validation rules are checked, and a single
     * generic error message is returned to prevent attackers from learning
     * which specific rule failed. This prevents incremental password crafting attacks.
     */
    validatePasswordStrength(password) {
        const violations = [];
        // Check all rules and collect violations (for logging only)
        if (password.length < constants_1.AUTH_CONSTANTS.MIN_PASSWORD_LENGTH) {
            violations.push('too_short');
        }
        if (password.length > constants_1.AUTH_CONSTANTS.MAX_PASSWORD_LENGTH) {
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
        for (const commonPassword of constants_1.AUTH_CONSTANTS.COMMON_PASSWORDS) {
            if (lowerPassword.includes(commonPassword.toLowerCase())) {
                violations.push('common_password');
                break;
            }
        }
        // Throw generic error if any violations exist
        if (violations.length > 0) {
            // Note: Do NOT include violations in the error message
            // They are collected here only for potential internal logging/metrics
            throw new http_exceptions_1.WeakPasswordException(PasswordService_1.GENERIC_PASSWORD_ERROR);
        }
    }
};
exports.PasswordService = PasswordService;
exports.PasswordService = PasswordService = PasswordService_1 = __decorate([
    (0, tsyringe_1.singleton)()
], PasswordService);
