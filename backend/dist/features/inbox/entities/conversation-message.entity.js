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
exports.ConversationMessage = void 0;
const typeorm_1 = require("typeorm");
const tenant_entity_1 = require("../../tenants/tenant.entity");
const user_entity_1 = require("../../users/user.entity");
const conversation_entity_1 = require("./conversation.entity");
const enums_1 = require("../enums");
/**
 * ConversationMessage entity represents an individual message within a conversation.
 *
 * Messages can be inbound (from customer) or outbound (to customer).
 * The content field is JSONB to support various content types with their specific structures.
 */
let ConversationMessage = class ConversationMessage {
    id;
    tenantId;
    tenant;
    conversationId;
    conversation;
    direction;
    contentType;
    /**
     * Message content stored as JSONB.
     * Structure varies by content_type:
     * - text: { body: string }
     * - image/video/audio/document: { url: string, caption?: string, filename?: string, mimeType?: string }
     * - template: { name: string, language: string, components: object[] }
     * - location: { latitude: number, longitude: number, name?: string, address?: string }
     * - sticker: { url: string }
     */
    content;
    providerMessageId;
    deliveryStatus;
    sentById;
    sentBy;
    errorMessage;
    errorCode;
    retryCount;
    metadata;
    sentAt;
    deliveredAt;
    readAt;
    createdAt;
    updatedAt;
};
exports.ConversationMessage = ConversationMessage;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ConversationMessage.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id' }),
    __metadata("design:type", String)
], ConversationMessage.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => tenant_entity_1.Tenant, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'tenant_id' }),
    __metadata("design:type", tenant_entity_1.Tenant)
], ConversationMessage.prototype, "tenant", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'conversation_id' }),
    __metadata("design:type", String)
], ConversationMessage.prototype, "conversationId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => conversation_entity_1.Conversation, (conversation) => conversation.messages, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'conversation_id' }),
    __metadata("design:type", conversation_entity_1.Conversation)
], ConversationMessage.prototype, "conversation", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: enums_1.MessageDirection,
        enumName: 'message_direction',
    }),
    __metadata("design:type", String)
], ConversationMessage.prototype, "direction", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'content_type',
        type: 'enum',
        enum: enums_1.MessageContentType,
        enumName: 'message_content_type',
    }),
    __metadata("design:type", String)
], ConversationMessage.prototype, "contentType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb' }),
    __metadata("design:type", Object)
], ConversationMessage.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'provider_message_id', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], ConversationMessage.prototype, "providerMessageId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'delivery_status',
        type: 'enum',
        enum: enums_1.MessageDeliveryStatus,
        enumName: 'message_delivery_status',
        default: enums_1.MessageDeliveryStatus.PENDING,
    }),
    __metadata("design:type", String)
], ConversationMessage.prototype, "deliveryStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sent_by_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], ConversationMessage.prototype, "sentById", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'sent_by_id' }),
    __metadata("design:type", Object)
], ConversationMessage.prototype, "sentBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'error_message', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], ConversationMessage.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'error_code', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", Object)
], ConversationMessage.prototype, "errorCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'retry_count', default: 0 }),
    __metadata("design:type", Number)
], ConversationMessage.prototype, "retryCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], ConversationMessage.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sent_at', type: 'timestamp with time zone', nullable: true }),
    __metadata("design:type", Object)
], ConversationMessage.prototype, "sentAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'delivered_at', type: 'timestamp with time zone', nullable: true }),
    __metadata("design:type", Object)
], ConversationMessage.prototype, "deliveredAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'read_at', type: 'timestamp with time zone', nullable: true }),
    __metadata("design:type", Object)
], ConversationMessage.prototype, "readAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ConversationMessage.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], ConversationMessage.prototype, "updatedAt", void 0);
exports.ConversationMessage = ConversationMessage = __decorate([
    (0, typeorm_1.Entity)('conversation_messages'),
    (0, typeorm_1.Index)('IDX_conversation_messages_conversation_created', ['conversationId', 'createdAt']),
    (0, typeorm_1.Index)('IDX_conversation_messages_provider_message_id', ['providerMessageId']),
    (0, typeorm_1.Index)('IDX_conversation_messages_tenant_conversation_direction', [
        'tenantId',
        'conversationId',
        'direction',
    ])
], ConversationMessage);
