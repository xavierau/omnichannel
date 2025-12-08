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
exports.MessageLog = exports.MessageStatus = void 0;
const typeorm_1 = require("typeorm");
const tenant_entity_1 = require("../tenants/tenant.entity");
const channel_entity_1 = require("../channels/channel.entity");
const provider_entity_1 = require("../providers/provider.entity");
/**
 * Message delivery status enum.
 */
var MessageStatus;
(function (MessageStatus) {
    MessageStatus["PENDING"] = "pending";
    MessageStatus["QUEUED"] = "queued";
    MessageStatus["SENT"] = "sent";
    MessageStatus["DELIVERED"] = "delivered";
    MessageStatus["READ"] = "read";
    MessageStatus["FAILED"] = "failed";
})(MessageStatus || (exports.MessageStatus = MessageStatus = {}));
/**
 * MessageLog entity tracks individual message delivery status.
 * Each message sent through the system gets a log entry for tracking.
 */
let MessageLog = class MessageLog {
    id;
    tenantId;
    tenant;
    broadcastId;
    // Note: We don't add ManyToOne to Broadcast here to avoid circular dependencies
    // The relationship can be handled at query time if needed
    customerId;
    channelAccountId;
    channelId;
    channel;
    providerId;
    provider;
    recipient; // Phone number or email
    status;
    providerMessageId; // ID from the provider (wamid for Meta, etc.)
    templateData;
    errorMessage;
    errorCode;
    providerResponse;
    sentAt;
    deliveredAt;
    readAt;
    failedAt;
    retryCount;
    usedFallback;
    createdAt;
    updatedAt;
};
exports.MessageLog = MessageLog;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MessageLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'tenant_id' }),
    __metadata("design:type", String)
], MessageLog.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => tenant_entity_1.Tenant, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'tenant_id' }),
    __metadata("design:type", tenant_entity_1.Tenant)
], MessageLog.prototype, "tenant", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'broadcast_id', nullable: true }),
    __metadata("design:type", Object)
], MessageLog.prototype, "broadcastId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_id', nullable: true }),
    __metadata("design:type", Object)
], MessageLog.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'channel_account_id', nullable: true }),
    __metadata("design:type", Object)
], MessageLog.prototype, "channelAccountId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'channel_id' }),
    __metadata("design:type", String)
], MessageLog.prototype, "channelId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => channel_entity_1.Channel),
    (0, typeorm_1.JoinColumn)({ name: 'channel_id' }),
    __metadata("design:type", channel_entity_1.Channel)
], MessageLog.prototype, "channel", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'provider_id' }),
    __metadata("design:type", String)
], MessageLog.prototype, "providerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => provider_entity_1.Provider),
    (0, typeorm_1.JoinColumn)({ name: 'provider_id' }),
    __metadata("design:type", provider_entity_1.Provider)
], MessageLog.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], MessageLog.prototype, "recipient", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: MessageStatus,
        default: MessageStatus.PENDING,
    }),
    __metadata("design:type", String)
], MessageLog.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'provider_message_id', length: 255, nullable: true }),
    __metadata("design:type", Object)
], MessageLog.prototype, "providerMessageId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'template_data', nullable: true }),
    __metadata("design:type", Object)
], MessageLog.prototype, "templateData", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'error_message', nullable: true }),
    __metadata("design:type", Object)
], MessageLog.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'error_code', length: 50, nullable: true }),
    __metadata("design:type", Object)
], MessageLog.prototype, "errorCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'provider_response', nullable: true }),
    __metadata("design:type", Object)
], MessageLog.prototype, "providerResponse", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sent_at', type: 'timestamp with time zone', nullable: true }),
    __metadata("design:type", Object)
], MessageLog.prototype, "sentAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'delivered_at', type: 'timestamp with time zone', nullable: true }),
    __metadata("design:type", Object)
], MessageLog.prototype, "deliveredAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'read_at', type: 'timestamp with time zone', nullable: true }),
    __metadata("design:type", Object)
], MessageLog.prototype, "readAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'failed_at', type: 'timestamp with time zone', nullable: true }),
    __metadata("design:type", Object)
], MessageLog.prototype, "failedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'retry_count', default: 0 }),
    __metadata("design:type", Number)
], MessageLog.prototype, "retryCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'used_fallback', default: false }),
    __metadata("design:type", Boolean)
], MessageLog.prototype, "usedFallback", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], MessageLog.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], MessageLog.prototype, "updatedAt", void 0);
exports.MessageLog = MessageLog = __decorate([
    (0, typeorm_1.Entity)('message_logs'),
    (0, typeorm_1.Index)(['tenantId', 'broadcastId']),
    (0, typeorm_1.Index)(['tenantId', 'createdAt']),
    (0, typeorm_1.Index)(['providerMessageId']),
    (0, typeorm_1.Index)(['status'])
], MessageLog);
