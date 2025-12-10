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
exports.ChannelAccountService = void 0;
const tsyringe_1 = require("tsyringe");
const crypto = __importStar(require("crypto"));
const channel_account_repository_1 = require("./channel-account.repository");
const channel_account_entity_1 = require("./channel-account.entity");
const channel_repository_1 = require("../channels/channel.repository");
const provider_repository_1 = require("../providers/provider.repository");
const credential_service_1 = require("../messaging/services/credential.service");
const messaging_service_1 = require("../messaging/services/messaging.service");
const provider_registry_1 = require("../messaging/provider-registry");
const team_service_1 = require("../teams/services/team.service");
const logger_config_1 = require("../../config/logger.config");
/**
 * Service for managing channel accounts.
 *
 * Handles CRUD operations with credential encryption/decryption.
 */
let ChannelAccountService = class ChannelAccountService {
    channelAccountRepo;
    channelRepo;
    providerRepo;
    credentialService;
    messagingService;
    providerRegistry;
    teamService;
    constructor(channelAccountRepo, channelRepo, providerRepo, credentialService, messagingService, providerRegistry, teamService) {
        this.channelAccountRepo = channelAccountRepo;
        this.channelRepo = channelRepo;
        this.providerRepo = providerRepo;
        this.credentialService = credentialService;
        this.messagingService = messagingService;
        this.providerRegistry = providerRegistry;
        this.teamService = teamService;
    }
    /**
     * Get all channel accounts for a tenant.
     *
     * @param tenantId - Tenant ID
     * @param channelCode - Optional channel filter
     * @returns List of channel accounts (without sensitive data)
     */
    async getByTenant(tenantId, channelCode) {
        const accounts = await this.channelAccountRepo.findByTenant(tenantId, {
            channelCode,
        });
        return Promise.all(accounts.map((account) => this.toResponseWithCredentialInfo(account)));
    }
    /**
     * Get a channel account by ID.
     *
     * @param id - Channel account ID
     * @param tenantId - Tenant ID for authorization
     * @returns Channel account or null
     */
    async getById(id, tenantId) {
        const account = await this.channelAccountRepo.findByIdAndTenant(id, tenantId);
        if (!account) {
            return null;
        }
        return this.toResponseWithCredentialInfo(account);
    }
    /**
     * Get a channel account with decrypted credentials (for internal use).
     *
     * @param id - Channel account ID
     * @param tenantId - Tenant ID for authorization
     * @returns Channel account with credentials or null
     */
    async getWithCredentials(id, tenantId) {
        const account = await this.channelAccountRepo.findByIdAndTenant(id, tenantId);
        if (!account) {
            return null;
        }
        const credentials = await this.credentialService.decryptCredentials(account.encryptedCredentials, account.credentialsIv);
        return { account, credentials };
    }
    /**
     * Create a new channel account.
     *
     * Performs synchronous credential validation before saving.
     * Extracts phoneNumberId from credentials for webhook routing.
     *
     * @param tenantId - Tenant ID
     * @param dto - Creation data
     * @returns Created channel account with verified account info
     * @throws Error if credentials are invalid
     */
    async create(tenantId, dto) {
        // 1. Validate channel exists
        const channel = await this.channelRepo.findByCode(dto.channelCode);
        if (!channel) {
            throw new Error(`Channel '${dto.channelCode}' not found`);
        }
        if (!channel.isActive) {
            throw new Error(`Channel '${dto.channelCode}' is not active`);
        }
        // 2. Resolve provider
        let providerEntity;
        if (dto.providerCode) {
            providerEntity = await this.providerRepo.findByCode(dto.providerCode);
            if (!providerEntity) {
                throw new Error(`Provider '${dto.providerCode}' not found`);
            }
        }
        else {
            // Get default provider for channel
            const providers = await this.providerRepo.findByChannel(channel.id, { isActive: true });
            providerEntity = providers[0];
            if (!providerEntity) {
                throw new Error(`No active provider available for channel '${dto.channelCode}'`);
            }
        }
        if (providerEntity.channelId !== channel.id) {
            throw new Error(`Provider '${providerEntity.code}' does not support channel '${dto.channelCode}'`);
        }
        // 3. Validate credentials against provider schema
        this.validateCredentials(dto.credentials, providerEntity.configSchema);
        // 4. Verify credentials synchronously BEFORE saving
        let verificationResult = null;
        if (this.providerRegistry.has(providerEntity.code)) {
            try {
                const providerInstance = this.providerRegistry.createInstance(providerEntity.code);
                await providerInstance.initialize(dto.credentials);
                const verification = await providerInstance.verifyCredentials();
                if (!verification.valid) {
                    throw new Error(`Invalid credentials: ${verification.error || 'Verification failed'}`);
                }
                verificationResult = {
                    valid: true,
                    accountInfo: verification.accountInfo,
                };
                logger_config_1.logger.debug('Credentials verified successfully', {
                    tenantId,
                    providerCode: providerEntity.code,
                    businessName: verification.accountInfo?.businessName,
                });
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown verification error';
                logger_config_1.logger.error('Credential verification failed during account creation', {
                    tenantId,
                    providerCode: providerEntity.code,
                    error: errorMessage,
                });
                throw new Error(`Invalid credentials: ${errorMessage}`);
            }
        }
        // 5. Encrypt credentials
        const { encrypted, iv } = await this.credentialService.encryptCredentials(dto.credentials);
        // 6. Extract phoneNumberId from credentials (for WhatsApp)
        const phoneNumberId = dto.credentials?.phoneNumberId || null;
        // 7. Create channel account with verified status since we validated synchronously
        const initialStatus = verificationResult?.valid
            ? channel_account_entity_1.ChannelAccountStatus.CONNECTED
            : channel_account_entity_1.ChannelAccountStatus.DISCONNECTED;
        const account = await this.channelAccountRepo.create({
            tenantId,
            channelId: channel.id,
            providerId: providerEntity.id,
            name: dto.name,
            phoneNumber: dto.phoneNumber || null,
            phoneNumberId,
            encryptedCredentials: encrypted,
            credentialsIv: iv,
            isActive: dto.isActive ?? true,
            isPrimary: dto.isPrimary ?? false,
            status: initialStatus,
            lastTestedAt: verificationResult?.valid ? new Date() : null,
        });
        // 8. If isPrimary, unset other primary accounts
        if (dto.isPrimary) {
            await this.channelAccountRepo.setPrimary(account.id, tenantId);
        }
        // 9. Assign channel account to teams if specified
        if (dto.teamIds && dto.teamIds.length > 0) {
            for (const teamId of dto.teamIds) {
                try {
                    await this.teamService.addChannelAccount(teamId, account.id);
                }
                catch (error) {
                    // Log but don't fail - team might not exist
                    logger_config_1.auditLogger.warn('Failed to assign channel account to team', {
                        teamId,
                        channelAccountId: account.id,
                        error: error.message,
                    });
                }
            }
        }
        logger_config_1.logger.info('Channel account created', {
            channelAccountId: account.id,
            tenantId,
            channelCode: dto.channelCode,
            providerCode: providerEntity.code,
            phoneNumberId,
            status: initialStatus,
        });
        // Fetch with relations for response
        const created = await this.channelAccountRepo.findByIdAndTenant(account.id, tenantId);
        const response = this.toResponse(created);
        // Include accountInfo in response if available
        if (verificationResult?.accountInfo) {
            response.accountInfo = verificationResult.accountInfo;
        }
        return response;
    }
    /**
     * Update a channel account.
     *
     * @param id - Channel account ID
     * @param tenantId - Tenant ID for authorization
     * @param dto - Update data
     * @returns Updated channel account
     */
    async update(id, tenantId, dto) {
        const existing = await this.channelAccountRepo.findByIdAndTenant(id, tenantId);
        if (!existing) {
            return null;
        }
        const updateData = {};
        if (dto.name !== undefined) {
            updateData.name = dto.name;
        }
        if (dto.phoneNumber !== undefined) {
            updateData.phoneNumber = dto.phoneNumber;
        }
        if (dto.isActive !== undefined) {
            updateData.isActive = dto.isActive;
        }
        // Handle credentials update
        if (dto.credentials) {
            const provider = await this.providerRepo.findById(existing.providerId);
            if (provider) {
                this.validateCredentials(dto.credentials, provider.configSchema);
            }
            const { encrypted, iv } = await this.credentialService.encryptCredentials(dto.credentials);
            updateData.encryptedCredentials = encrypted;
            updateData.credentialsIv = iv;
            // Reset status to disconnected when credentials change
            updateData.status = channel_account_entity_1.ChannelAccountStatus.DISCONNECTED;
        }
        // Update the account
        const updated = await this.channelAccountRepo.update(id, tenantId, updateData);
        if (!updated) {
            return null;
        }
        // Handle isPrimary change
        if (dto.isPrimary === true) {
            await this.channelAccountRepo.setPrimary(id, tenantId);
        }
        // Test connection if credentials changed
        if (dto.credentials) {
            this.testConnectionAsync(id, tenantId);
        }
        logger_config_1.logger.info('Channel account updated', {
            channelAccountId: id,
            tenantId,
            fieldsUpdated: Object.keys(updateData),
        });
        // Fetch fresh with relations
        const result = await this.channelAccountRepo.findByIdAndTenant(id, tenantId);
        return this.toResponseWithCredentialInfo(result);
    }
    /**
     * Delete a channel account.
     *
     * @param id - Channel account ID
     * @param tenantId - Tenant ID for authorization
     * @returns true if deleted
     */
    async delete(id, tenantId) {
        const deleted = await this.channelAccountRepo.delete(id, tenantId);
        if (deleted) {
            logger_config_1.logger.info('Channel account deleted', {
                channelAccountId: id,
                tenantId,
            });
        }
        return deleted;
    }
    /**
     * Test connection to the provider.
     *
     * @param id - Channel account ID
     * @param tenantId - Tenant ID for authorization
     * @returns Test result
     */
    async testConnection(id, tenantId) {
        const result = await this.messagingService.verifyChannelAccountCredentials(id, tenantId);
        // Update status based on result
        const status = result.valid
            ? channel_account_entity_1.ChannelAccountStatus.CONNECTED
            : channel_account_entity_1.ChannelAccountStatus.ERROR;
        await this.channelAccountRepo.updateStatus(id, status, result.valid ? undefined : result.error);
        logger_config_1.logger.info('Channel account connection tested', {
            channelAccountId: id,
            tenantId,
            success: result.valid,
            error: result.error,
        });
        return {
            success: result.valid,
            error: result.error,
            accountInfo: result.accountInfo,
        };
    }
    /**
     * Set a channel account as primary for its channel type.
     *
     * @param id - Channel account ID
     * @param tenantId - Tenant ID for authorization
     * @returns true if successful
     */
    async setPrimary(id, tenantId) {
        const result = await this.channelAccountRepo.setPrimary(id, tenantId);
        if (result) {
            logger_config_1.logger.info('Channel account set as primary', {
                channelAccountId: id,
                tenantId,
            });
        }
        return result;
    }
    /**
     * Sync templates from the provider.
     *
     * @param id - Channel account ID
     * @param tenantId - Tenant ID for authorization
     * @returns Template sync result
     */
    async syncTemplates(id, tenantId) {
        return this.messagingService.getProviderTemplates(id, tenantId);
    }
    /**
     * Generate webhook URL for a channel account.
     *
     * @param id - Channel account ID
     * @param tenantId - Tenant ID
     * @returns Webhook URL
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getWebhookUrl(id, tenantId) {
        const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
        // For Meta, webhook is account-agnostic; for others may be per-account
        return `${baseUrl}/webhooks/meta`;
    }
    /**
     * Generate webhook configuration for a channel account.
     *
     * Returns the webhook URL and verify token needed for Meta webhook setup.
     * If no verify token exists, generates and stores a secure random token.
     *
     * @param id - Channel account ID
     * @param tenantId - Tenant ID for authorization
     * @returns Webhook configuration with URL and verify token
     * @throws Error if channel account not found
     */
    async generateWebhookConfig(id, tenantId) {
        const account = await this.channelAccountRepo.findByIdAndTenant(id, tenantId);
        if (!account) {
            throw new Error('Channel account not found');
        }
        // Check if verify token already exists (stored encrypted in webhookSecretEncrypted)
        let verifyToken;
        if (account.webhookSecretEncrypted && account.webhookSecretIv) {
            // Decrypt existing verify token
            try {
                const decrypted = await this.credentialService.decryptCredentials(account.webhookSecretEncrypted, account.webhookSecretIv);
                verifyToken = decrypted.verifyToken;
            }
            catch {
                // If decryption fails, generate a new token
                logger_config_1.logger.warn('Failed to decrypt existing verify token, generating new one', {
                    channelAccountId: id,
                });
                verifyToken = await this.createAndStoreVerifyToken(id, tenantId);
            }
        }
        else {
            // Generate and store new verify token
            verifyToken = await this.createAndStoreVerifyToken(id, tenantId);
        }
        const baseUrl = process.env.WEBHOOK_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000';
        const webhookUrl = `${baseUrl}/webhooks/meta`;
        logger_config_1.logger.info('Generated webhook config', {
            channelAccountId: id,
            tenantId,
            webhookUrl,
        });
        return { webhookUrl, verifyToken };
    }
    /**
     * Create and store a new verify token for a channel account.
     */
    async createAndStoreVerifyToken(id, tenantId) {
        // Generate secure random token (64 hex characters = 32 bytes)
        const verifyToken = crypto.randomBytes(32).toString('hex');
        // Encrypt the token for storage
        const { encrypted, iv } = await this.credentialService.encryptCredentials({
            verifyToken,
        });
        // Store encrypted token
        await this.channelAccountRepo.updateWebhookConfig(id, tenantId, encrypted, iv);
        return verifyToken;
    }
    // Private helper methods
    /**
     * Convert entity to response DTO (excludes sensitive data).
     */
    toResponse(account) {
        return {
            id: account.id,
            name: account.name,
            phoneNumber: account.phoneNumber,
            phoneNumberId: account.phoneNumberId,
            channelCode: account.channel?.code || '',
            channelName: account.channel?.name || '',
            providerCode: account.provider?.code || '',
            providerName: account.provider?.name || '',
            isActive: account.isActive,
            isPrimary: account.isPrimary,
            status: account.status,
            lastTestedAt: account.lastTestedAt,
            errorMessage: account.errorMessage,
            webhookUrl: account.webhookUrl,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
        };
    }
    /**
     * Add non-sensitive credential info to response.
     */
    async toResponseWithCredentialInfo(account) {
        const response = this.toResponse(account);
        try {
            const credentials = await this.credentialService.decryptCredentials(account.encryptedCredentials, account.credentialsIv);
            // Only include non-sensitive fields
            response.credentials = {};
            if (credentials.phoneNumberId) {
                response.credentials.phoneNumberId = credentials.phoneNumberId;
            }
            if (credentials.whatsappBusinessAccountId) {
                response.credentials.whatsappBusinessAccountId =
                    credentials.whatsappBusinessAccountId;
            }
            if (credentials.appId) {
                response.credentials.appId = credentials.appId;
            }
        }
        catch {
            logger_config_1.logger.warn('Failed to decrypt credentials for response', {
                channelAccountId: account.id,
            });
        }
        return response;
    }
    /**
     * Validate credentials against provider schema.
     */
    validateCredentials(credentials, schema) {
        // Basic validation - check required fields
        const requiredFields = schema.required || [];
        for (const field of requiredFields) {
            if (credentials[field] === undefined ||
                credentials[field] === null ||
                credentials[field] === '') {
                throw new Error(`Missing required credential field: ${field}`);
            }
        }
    }
    /**
     * Test connection asynchronously (fire and forget).
     */
    testConnectionAsync(id, tenantId) {
        this.testConnection(id, tenantId).catch((error) => {
            logger_config_1.logger.error('Background connection test failed', {
                channelAccountId: id,
                tenantId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        });
    }
};
exports.ChannelAccountService = ChannelAccountService;
exports.ChannelAccountService = ChannelAccountService = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(channel_account_repository_1.ChannelAccountRepository)),
    __param(1, (0, tsyringe_1.inject)(channel_repository_1.ChannelRepository)),
    __param(2, (0, tsyringe_1.inject)(provider_repository_1.ProviderRepository)),
    __param(3, (0, tsyringe_1.inject)(credential_service_1.CredentialService)),
    __param(4, (0, tsyringe_1.inject)(messaging_service_1.MessagingService)),
    __param(5, (0, tsyringe_1.inject)(provider_registry_1.ProviderRegistry)),
    __param(6, (0, tsyringe_1.inject)(team_service_1.TeamService)),
    __metadata("design:paramtypes", [channel_account_repository_1.ChannelAccountRepository,
        channel_repository_1.ChannelRepository,
        provider_repository_1.ProviderRepository,
        credential_service_1.CredentialService,
        messaging_service_1.MessagingService,
        provider_registry_1.ProviderRegistry,
        team_service_1.TeamService])
], ChannelAccountService);
