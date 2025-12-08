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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialService = exports.EnvEncryptionKeyProvider = void 0;
const tsyringe_1 = require("tsyringe");
const crypto = __importStar(require("crypto"));
/**
 * Environment-based key provider (for development/simple deployments).
 */
let EnvEncryptionKeyProvider = class EnvEncryptionKeyProvider {
    KEY_LENGTH = 32; // 256 bits
    async getKey() {
        const keyHex = process.env.CREDENTIAL_ENCRYPTION_KEY;
        if (!keyHex) {
            throw new Error('CREDENTIAL_ENCRYPTION_KEY environment variable is not set. ' +
                'Generate one with: openssl rand -hex 32');
        }
        if (keyHex.length !== 64) {
            throw new Error('CREDENTIAL_ENCRYPTION_KEY must be exactly 64 hex characters (256 bits). ' +
                `Current length: ${keyHex.length}`);
        }
        return Buffer.from(keyHex, 'hex');
    }
};
exports.EnvEncryptionKeyProvider = EnvEncryptionKeyProvider;
exports.EnvEncryptionKeyProvider = EnvEncryptionKeyProvider = __decorate([
    (0, tsyringe_1.singleton)()
], EnvEncryptionKeyProvider);
/**
 * Service for encrypting/decrypting provider credentials.
 * Uses AES-256-GCM for symmetric encryption with authenticated encryption.
 */
let CredentialService = class CredentialService {
    keyProvider;
    algorithm = 'aes-256-gcm';
    ivLength = 16; // 128 bits
    tagLength = 16; // 128 bits
    constructor(keyProvider) {
        this.keyProvider = keyProvider;
    }
    /**
     * Encrypt credentials for secure storage.
     *
     * @param credentials - Provider credentials object
     * @returns Encrypted data and initialization vector
     */
    async encryptCredentials(credentials) {
        const key = await this.keyProvider.getKey();
        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipheriv(this.algorithm, key, iv, {
            authTagLength: this.tagLength,
        });
        const plaintext = JSON.stringify(credentials);
        let encrypted = cipher.update(plaintext, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        const authTag = cipher.getAuthTag();
        // Combine encrypted data with auth tag for integrity verification
        const combined = Buffer.concat([Buffer.from(encrypted, 'base64'), authTag]);
        return {
            encrypted: combined.toString('base64'),
            iv: iv.toString('base64'),
        };
    }
    /**
     * Decrypt credentials for use.
     *
     * @param encryptedData - Base64 encoded encrypted data with auth tag
     * @param ivBase64 - Base64 encoded initialization vector
     * @returns Decrypted credentials object
     */
    async decryptCredentials(encryptedData, ivBase64) {
        const key = await this.keyProvider.getKey();
        const iv = Buffer.from(ivBase64, 'base64');
        const combined = Buffer.from(encryptedData, 'base64');
        // Split auth tag from encrypted data
        const authTag = combined.slice(-this.tagLength);
        const encrypted = combined.slice(0, -this.tagLength);
        const decipher = crypto.createDecipheriv(this.algorithm, key, iv, {
            authTagLength: this.tagLength,
        });
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encrypted.toString('base64'), 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return JSON.parse(decrypted);
    }
    /**
     * Encrypt a single string value (e.g., webhook secret).
     *
     * @param value - String to encrypt
     * @returns Encrypted data and initialization vector
     */
    async encryptString(value) {
        return this.encryptCredentials({ value });
    }
    /**
     * Decrypt a single string value.
     *
     * @param encryptedData - Base64 encoded encrypted data
     * @param ivBase64 - Base64 encoded initialization vector
     * @returns Decrypted string
     */
    async decryptString(encryptedData, ivBase64) {
        const result = await this.decryptCredentials(encryptedData, ivBase64);
        return result.value;
    }
};
exports.CredentialService = CredentialService;
exports.CredentialService = CredentialService = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)('EncryptionKeyProvider')),
    __metadata("design:paramtypes", [Object])
], CredentialService);
