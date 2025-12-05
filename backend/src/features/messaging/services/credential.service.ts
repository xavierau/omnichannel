import { singleton, inject } from 'tsyringe';
import * as crypto from 'crypto';
import { ProviderCredentials } from '../interfaces';

/**
 * Interface for encryption key providers.
 * Allows different key management strategies (env var, KMS, Vault).
 */
export interface IEncryptionKeyProvider {
  getKey(): Promise<Buffer>;
}

/**
 * Environment-based key provider (for development/simple deployments).
 */
@singleton()
export class EnvEncryptionKeyProvider implements IEncryptionKeyProvider {
  private readonly KEY_LENGTH = 32; // 256 bits

  async getKey(): Promise<Buffer> {
    const keyHex = process.env.CREDENTIAL_ENCRYPTION_KEY;

    if (!keyHex) {
      throw new Error(
        'CREDENTIAL_ENCRYPTION_KEY environment variable is not set. ' +
          'Generate one with: openssl rand -hex 32'
      );
    }

    if (keyHex.length !== 64) {
      throw new Error(
        'CREDENTIAL_ENCRYPTION_KEY must be exactly 64 hex characters (256 bits). ' +
          `Current length: ${keyHex.length}`
      );
    }

    return Buffer.from(keyHex, 'hex');
  }
}

/**
 * Result of credential encryption.
 */
export interface EncryptionResult {
  encrypted: string;
  iv: string;
}

/**
 * Service for encrypting/decrypting provider credentials.
 * Uses AES-256-GCM for symmetric encryption with authenticated encryption.
 */
@singleton()
export class CredentialService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 16; // 128 bits
  private readonly tagLength = 16; // 128 bits

  constructor(
    @inject('EncryptionKeyProvider') private keyProvider: IEncryptionKeyProvider
  ) {}

  /**
   * Encrypt credentials for secure storage.
   *
   * @param credentials - Provider credentials object
   * @returns Encrypted data and initialization vector
   */
  async encryptCredentials(credentials: ProviderCredentials): Promise<EncryptionResult> {
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
  async decryptCredentials(
    encryptedData: string,
    ivBase64: string
  ): Promise<ProviderCredentials> {
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
  async encryptString(value: string): Promise<EncryptionResult> {
    return this.encryptCredentials({ value } as ProviderCredentials);
  }

  /**
   * Decrypt a single string value.
   *
   * @param encryptedData - Base64 encoded encrypted data
   * @param ivBase64 - Base64 encoded initialization vector
   * @returns Decrypted string
   */
  async decryptString(encryptedData: string, ivBase64: string): Promise<string> {
    const result = await this.decryptCredentials(encryptedData, ivBase64);
    return result.value as string;
  }
}
