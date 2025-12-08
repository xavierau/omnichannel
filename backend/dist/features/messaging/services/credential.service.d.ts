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
export declare class EnvEncryptionKeyProvider implements IEncryptionKeyProvider {
    private readonly KEY_LENGTH;
    getKey(): Promise<Buffer>;
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
export declare class CredentialService {
    private keyProvider;
    private readonly algorithm;
    private readonly ivLength;
    private readonly tagLength;
    constructor(keyProvider: IEncryptionKeyProvider);
    /**
     * Encrypt credentials for secure storage.
     *
     * @param credentials - Provider credentials object
     * @returns Encrypted data and initialization vector
     */
    encryptCredentials(credentials: ProviderCredentials): Promise<EncryptionResult>;
    /**
     * Decrypt credentials for use.
     *
     * @param encryptedData - Base64 encoded encrypted data with auth tag
     * @param ivBase64 - Base64 encoded initialization vector
     * @returns Decrypted credentials object
     */
    decryptCredentials(encryptedData: string, ivBase64: string): Promise<ProviderCredentials>;
    /**
     * Encrypt a single string value (e.g., webhook secret).
     *
     * @param value - String to encrypt
     * @returns Encrypted data and initialization vector
     */
    encryptString(value: string): Promise<EncryptionResult>;
    /**
     * Decrypt a single string value.
     *
     * @param encryptedData - Base64 encoded encrypted data
     * @param ivBase64 - Base64 encoded initialization vector
     * @returns Decrypted string
     */
    decryptString(encryptedData: string, ivBase64: string): Promise<string>;
}
