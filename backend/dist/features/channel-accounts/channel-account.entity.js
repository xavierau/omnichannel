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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelAccount = exports.ChannelAccountStatus = void 0;
const typeorm_1 = require("typeorm");
const tenant_entity_1 = require("../tenants/tenant.entity");
const channel_entity_1 = require("../channels/channel.entity");
const provider_entity_1 = require("../providers/provider.entity");
/**
 * Channel account status enum.
 */
var ChannelAccountStatus;
(function (ChannelAccountStatus) {
    ChannelAccountStatus["CONNECTED"] = "connected";
    ChannelAccountStatus["DISCONNECTED"] = "disconnected";
    ChannelAccountStatus["ERROR"] = "error";
})(ChannelAccountStatus || (exports.ChannelAccountStatus = ChannelAccountStatus = {}));
/**
 * ChannelAccount entity represents a tenant's configured messaging account.
 * Each tenant can have multiple channel accounts (e.g., "Marketing Line", "Support Line").
 * Each account is linked to a specific provider (Meta, Twilio, etc.).
 */
let ChannelAccount = class ChannelAccount {
    id;
    tenantId;
    tenant;
    channelId;
    channel;
    providerId;
    provider;
    name; // Display name: "Marketing Line", "Customer Support"
    phoneNumber; // Display phone number: "+1 555-123-4567"
    /**
     * Provider-specific phone number ID.
     * For Meta/WhatsApp: This is the phone_number_id used in API calls and webhooks.
     * Used for efficient webhook routing without credential decryption.
     */
    phoneNumberId;
    /**
     * Encrypted provider credentials (AES-256-GCM).
     * The structure depends on the provider:
     * - Meta: { phoneNumberId, whatsappBusinessAccountId, accessToken, appId, appSecret }
     * - Twilio: { accountSid, authToken, fromNumber }
     */
    encryptedCredentials;
    credentialsIv;
    isActive;
    isPrimary; // Default account for this channel type
    status;
    lastTestedAt;
    errorMessage;
    webhookUrl;
    webhookSecretEncrypted;
    webhookSecretIv;
    createdAt;
    updatedAt;
};
exports.ChannelAccount = ChannelAccount;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ChannelAccount.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'tenant_id' }),
    __metadata("design:type", String)
], ChannelAccount.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => tenant_entity_1.Tenant, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'tenant_id' }),
    __metadata("design:type", tenant_entity_1.Tenant)
], ChannelAccount.prototype, "tenant", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'channel_id' }),
    __metadata("design:type", String)
], ChannelAccount.prototype, "channelId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => channel_entity_1.Channel, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'channel_id' }),
    __metadata("design:type", channel_entity_1.Channel)
], ChannelAccount.prototype, "channel", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'provider_id' }),
    __metadata("design:type", String)
], ChannelAccount.prototype, "providerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => provider_entity_1.Provider, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'provider_id' }),
    __metadata("design:type", provider_entity_1.Provider)
], ChannelAccount.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], ChannelAccount.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'phone_number', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", Object)
], ChannelAccount.prototype, "phoneNumber", void 0);
__decorate([
    (0, typeorm_1.Index)('IDX_channel_accounts_phone_number_id'),
    (0, typeorm_1.Column)({ name: 'phone_number_id', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], ChannelAccount.prototype, "phoneNumberId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'encrypted_credentials' }),
    __metadata("design:type", String)
], ChannelAccount.prototype, "encryptedCredentials", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'credentials_iv' }),
    __metadata("design:type", String)
], ChannelAccount.prototype, "credentialsIv", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true }),
    __metadata("design:type", Boolean)
], ChannelAccount.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_primary', default: false }),
    __metadata("design:type", Boolean)
], ChannelAccount.prototype, "isPrimary", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ChannelAccountStatus,
        default: ChannelAccountStatus.DISCONNECTED,
    }),
    __metadata("design:type", String)
], ChannelAccount.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_tested_at', type: 'timestamp with time zone', nullable: true }),
    __metadata("design:type", Object)
], ChannelAccount.prototype, "lastTestedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'error_message', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], ChannelAccount.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'webhook_url', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], ChannelAccount.prototype, "webhookUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'webhook_secret_encrypted', nullable: true }),
    __metadata("design:type", Object)
], ChannelAccount.prototype, "webhookSecretEncrypted", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'webhook_secret_iv', nullable: true }),
    __metadata("design:type", Object)
], ChannelAccount.prototype, "webhookSecretIv", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ChannelAccount.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], ChannelAccount.prototype, "updatedAt", void 0);
exports.ChannelAccount = ChannelAccount = __decorate([
    (0, typeorm_1.Entity)('channel_accounts'),
    (0, typeorm_1.Index)(['tenantId', 'channelId']),
    (0, typeorm_1.Index)(['tenantId', 'isPrimary'])
], ChannelAccount);
