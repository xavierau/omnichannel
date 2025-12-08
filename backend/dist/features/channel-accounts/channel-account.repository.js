"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelAccountRepository = void 0;
const tsyringe_1 = require("tsyringe");
const database_config_1 = require("../../config/database.config");
const channel_account_entity_1 = require("./channel-account.entity");
let ChannelAccountRepository = class ChannelAccountRepository {
    _repository = null;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     * This prevents errors when the DI container instantiates this class before
     * the database connection is established.
     */
    get repository() {
        if (!this._repository) {
            this._repository = database_config_1.AppDataSource.getRepository(channel_account_entity_1.ChannelAccount);
        }
        return this._repository;
    }
    /**
     * Find all channel accounts for a tenant.
     */
    async findByTenant(tenantId, options) {
        const queryBuilder = this.repository
            .createQueryBuilder('account')
            .leftJoinAndSelect('account.channel', 'channel')
            .leftJoinAndSelect('account.provider', 'provider')
            .where('account.tenant_id = :tenantId', { tenantId });
        if (options?.channelCode) {
            queryBuilder.andWhere('channel.code = :channelCode', {
                channelCode: options.channelCode,
            });
        }
        if (options?.isActive !== undefined) {
            queryBuilder.andWhere('account.is_active = :isActive', {
                isActive: options.isActive,
            });
        }
        return queryBuilder.orderBy('account.name', 'ASC').getMany();
    }
    /**
     * Find a channel account by ID.
     */
    async findById(id) {
        return this.repository.findOne({
            where: { id },
            relations: ['channel', 'provider'],
        });
    }
    /**
     * Find a channel account by ID for a specific tenant.
     */
    async findByIdAndTenant(id, tenantId) {
        return this.repository.findOne({
            where: { id, tenantId },
            relations: ['channel', 'provider'],
        });
    }
    /**
     * Find primary channel account for a tenant and channel.
     */
    async findPrimaryByTenantAndChannel(tenantId, channelCode) {
        return this.repository
            .createQueryBuilder('account')
            .leftJoinAndSelect('account.channel', 'channel')
            .leftJoinAndSelect('account.provider', 'provider')
            .where('account.tenant_id = :tenantId', { tenantId })
            .andWhere('channel.code = :channelCode', { channelCode })
            .andWhere('account.is_primary = :isPrimary', { isPrimary: true })
            .andWhere('account.is_active = :isActive', { isActive: true })
            .getOne();
    }
    /**
     * Create a new channel account.
     */
    async create(data) {
        const account = this.repository.create(data);
        return this.repository.save(account);
    }
    /**
     * Update a channel account.
     */
    async update(id, tenantId, data) {
        const account = await this.findByIdAndTenant(id, tenantId);
        if (!account) {
            return null;
        }
        Object.assign(account, data);
        return this.repository.save(account);
    }
    /**
     * Delete a channel account.
     */
    async delete(id, tenantId) {
        const result = await this.repository.delete({ id, tenantId });
        return result.affected !== 0;
    }
    /**
     * Update connection status.
     */
    async updateStatus(id, status, errorMessage) {
        await this.repository.update(id, {
            status,
            errorMessage: errorMessage || null,
            lastTestedAt: new Date(),
        });
    }
    /**
     * Set a channel account as primary (and unset others for same channel).
     */
    async setPrimary(id, tenantId) {
        const account = await this.findByIdAndTenant(id, tenantId);
        if (!account) {
            return false;
        }
        // Unset primary for all other accounts of same channel
        await this.repository
            .createQueryBuilder()
            .update(channel_account_entity_1.ChannelAccount)
            .set({ isPrimary: false })
            .where('tenant_id = :tenantId', { tenantId })
            .andWhere('channel_id = :channelId', { channelId: account.channelId })
            .andWhere('id != :id', { id })
            .execute();
        // Set this account as primary
        await this.repository.update(id, { isPrimary: true });
        return true;
    }
    /**
     * Count channel accounts for a tenant.
     */
    async countByTenant(tenantId) {
        return this.repository.count({ where: { tenantId } });
    }
    /**
     * Find an active channel account by its provider phone number ID.
     *
     * This is the primary lookup method for routing inbound webhook events.
     * Only returns active accounts to prevent message delivery to disabled accounts.
     *
     * @param phoneNumberId - The provider's phone number ID (e.g., Meta's phone_number_id)
     * @returns The active channel account or null if not found
     */
    async findByPhoneNumberId(phoneNumberId) {
        return this.repository.findOne({
            where: {
                phoneNumberId,
                isActive: true,
            },
            relations: ['channel', 'provider'],
        });
    }
    /**
     * Update webhook configuration for a channel account.
     *
     * Stores the encrypted verify token for webhook verification.
     *
     * @param id - Channel account ID
     * @param tenantId - Tenant ID for authorization
     * @param encryptedSecret - Encrypted webhook secret/verify token
     * @param secretIv - Initialization vector for encryption
     */
    async updateWebhookConfig(id, tenantId, encryptedSecret, secretIv) {
        await this.repository.update({ id, tenantId }, {
            webhookSecretEncrypted: encryptedSecret,
            webhookSecretIv: secretIv,
        });
    }
    /**
     * Find all active channel accounts.
     *
     * Used for batch operations like template status webhook processing
     * where we need to check credentials across all accounts.
     *
     * @returns All active channel accounts with relations
     */
    async findAllActive() {
        return this.repository.find({
            where: { isActive: true },
            relations: ['channel', 'provider'],
        });
    }
};
exports.ChannelAccountRepository = ChannelAccountRepository;
exports.ChannelAccountRepository = ChannelAccountRepository = __decorate([
    (0, tsyringe_1.singleton)()
], ChannelAccountRepository);
