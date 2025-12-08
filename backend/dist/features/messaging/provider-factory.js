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
exports.ProviderFactory = exports.ProviderNotImplementedException = exports.ProviderNotFoundException = exports.ProviderNotConfiguredException = void 0;
const tsyringe_1 = require("tsyringe");
const provider_registry_1 = require("./provider-registry");
const credential_service_1 = require("./services/credential.service");
const channel_account_repository_1 = require("../channel-accounts/channel-account.repository");
const provider_repository_1 = require("../providers/provider.repository");
const logger_config_1 = require("../../config/logger.config");
/**
 * Custom exceptions for provider operations.
 */
class ProviderNotConfiguredException extends Error {
    constructor(message) {
        super(message);
        this.name = 'ProviderNotConfiguredException';
    }
}
exports.ProviderNotConfiguredException = ProviderNotConfiguredException;
class ProviderNotFoundException extends Error {
    constructor(message) {
        super(message);
        this.name = 'ProviderNotFoundException';
    }
}
exports.ProviderNotFoundException = ProviderNotFoundException;
class ProviderNotImplementedException extends Error {
    constructor(message) {
        super(message);
        this.name = 'ProviderNotImplementedException';
    }
}
exports.ProviderNotImplementedException = ProviderNotImplementedException;
/**
 * Factory for creating and initializing messaging providers.
 * Implements Factory Pattern with credential decryption.
 */
let ProviderFactory = class ProviderFactory {
    registry;
    channelAccountRepo;
    providerRepo;
    credentialService;
    constructor(registry, channelAccountRepo, providerRepo, credentialService) {
        this.registry = registry;
        this.channelAccountRepo = channelAccountRepo;
        this.providerRepo = providerRepo;
        this.credentialService = credentialService;
    }
    /**
     * Create and initialize a provider for a specific channel account.
     *
     * @param channelAccountId - Channel account UUID
     * @returns Initialized provider instance ready to send messages
     */
    async createProviderForChannelAccount(channelAccountId) {
        // 1. Load channel account
        const channelAccount = await this.channelAccountRepo.findById(channelAccountId);
        if (!channelAccount) {
            throw new ProviderNotConfiguredException(`Channel account '${channelAccountId}' not found`);
        }
        if (!channelAccount.isActive) {
            throw new ProviderNotConfiguredException(`Channel account '${channelAccount.name}' is not active`);
        }
        // 2. Load provider definition
        const provider = await this.providerRepo.findById(channelAccount.providerId);
        if (!provider) {
            throw new ProviderNotFoundException(`Provider '${channelAccount.providerId}' not found`);
        }
        // 3. Get provider implementation
        if (!this.registry.has(provider.code)) {
            throw new ProviderNotImplementedException(`No implementation found for provider '${provider.code}'`);
        }
        // 4. Decrypt credentials
        const credentials = await this.credentialService.decryptCredentials(channelAccount.encryptedCredentials, channelAccount.credentialsIv);
        // 5. Create and initialize provider instance
        const providerInstance = this.registry.createInstance(provider.code);
        await providerInstance.initialize(credentials);
        logger_config_1.logger.debug('Provider initialized for channel account', {
            channelAccountId,
            channelAccountName: channelAccount.name,
            providerCode: provider.code,
        });
        return providerInstance;
    }
    /**
     * Create and initialize a provider for a tenant's channel (uses primary account).
     *
     * @param tenantId - Tenant UUID
     * @param channelCode - Channel code (e.g., 'whatsapp')
     * @returns Initialized provider instance
     */
    async createProviderForTenantChannel(tenantId, channelCode) {
        // Find primary channel account for this tenant and channel
        const channelAccount = await this.channelAccountRepo.findPrimaryByTenantAndChannel(tenantId, channelCode);
        if (!channelAccount) {
            throw new ProviderNotConfiguredException(`No primary channel account configured for tenant on channel '${channelCode}'`);
        }
        return this.createProviderForChannelAccount(channelAccount.id);
    }
    /**
     * Create provider for webhook handling (no initialization needed).
     * Used for parsing webhook payloads and validating signatures.
     *
     * @param providerCode - Provider code (e.g., 'meta_cloud_api')
     * @returns Uninitialized provider instance
     */
    createProviderForWebhook(providerCode) {
        if (!this.registry.has(providerCode)) {
            throw new ProviderNotImplementedException(`No implementation found for provider '${providerCode}'`);
        }
        return this.registry.createInstance(providerCode);
    }
    /**
     * Create and initialize a provider with explicit credentials.
     * Used for testing credentials before saving.
     *
     * @param providerCode - Provider code
     * @param credentials - Provider credentials
     * @returns Initialized provider instance
     */
    async createProviderWithCredentials(providerCode, credentials) {
        if (!this.registry.has(providerCode)) {
            throw new ProviderNotImplementedException(`No implementation found for provider '${providerCode}'`);
        }
        const providerInstance = this.registry.createInstance(providerCode);
        await providerInstance.initialize(credentials);
        return providerInstance;
    }
};
exports.ProviderFactory = ProviderFactory;
exports.ProviderFactory = ProviderFactory = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(provider_registry_1.ProviderRegistry)),
    __param(1, (0, tsyringe_1.inject)(channel_account_repository_1.ChannelAccountRepository)),
    __param(2, (0, tsyringe_1.inject)(provider_repository_1.ProviderRepository)),
    __param(3, (0, tsyringe_1.inject)(credential_service_1.CredentialService)),
    __metadata("design:paramtypes", [provider_registry_1.ProviderRegistry,
        channel_account_repository_1.ChannelAccountRepository,
        provider_repository_1.ProviderRepository,
        credential_service_1.CredentialService])
], ProviderFactory);
