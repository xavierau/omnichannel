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
exports.Conversation = void 0;
const typeorm_1 = require("typeorm");
const tenant_entity_1 = require("../../tenants/tenant.entity");
const customer_entity_1 = require("../../customers/customer.entity");
const channel_account_entity_1 = require("../../channel-accounts/channel-account.entity");
const user_entity_1 = require("../../users/user.entity");
const enums_1 = require("../enums");
const conversation_message_entity_1 = require("./conversation-message.entity");
const conversation_note_entity_1 = require("./conversation-note.entity");
const conversation_assignment_entity_1 = require("./conversation-assignment.entity");
/**
 * Conversation entity represents a messaging thread between a customer
 * and the organization through a specific channel account.
 *
 * A conversation is unique per tenant-customer-channel combination.
 */
let Conversation = class Conversation {
    id;
    tenantId;
    tenant;
    customerId;
    customer;
    channelAccountId;
    channelAccount;
    assignedToId;
    assignedTo;
    status;
    lastMessageAt;
    lastMessagePreview;
    lastMessageDirection;
    unreadCount;
    /**
     * Timestamp of the last inbound (customer) message.
     * Used for WhatsApp Cloud API 24-hour messaging window compliance.
     * When null, indicates no customer message has been received yet.
     */
    lastCustomerMessageAt;
    metadata;
    messages;
    notes;
    assignments;
    createdAt;
    updatedAt;
};
exports.Conversation = Conversation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Conversation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id' }),
    __metadata("design:type", String)
], Conversation.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => tenant_entity_1.Tenant, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'tenant_id' }),
    __metadata("design:type", tenant_entity_1.Tenant)
], Conversation.prototype, "tenant", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], Conversation.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => customer_entity_1.Customer, { onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'customer_id' }),
    __metadata("design:type", Object)
], Conversation.prototype, "customer", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'channel_account_id' }),
    __metadata("design:type", String)
], Conversation.prototype, "channelAccountId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => channel_account_entity_1.ChannelAccount, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'channel_account_id' }),
    __metadata("design:type", channel_account_entity_1.ChannelAccount)
], Conversation.prototype, "channelAccount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'assigned_to_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], Conversation.prototype, "assignedToId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'assigned_to_id' }),
    __metadata("design:type", Object)
], Conversation.prototype, "assignedTo", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: enums_1.ConversationStatus,
        enumName: 'conversation_status',
        default: enums_1.ConversationStatus.UNASSIGNED,
    }),
    __metadata("design:type", String)
], Conversation.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_message_at', type: 'timestamp with time zone', nullable: true }),
    __metadata("design:type", Object)
], Conversation.prototype, "lastMessageAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_message_preview', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], Conversation.prototype, "lastMessagePreview", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'last_message_direction',
        type: 'enum',
        enum: enums_1.MessageDirection,
        enumName: 'message_direction',
        nullable: true,
    }),
    __metadata("design:type", Object)
], Conversation.prototype, "lastMessageDirection", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'unread_count', default: 0 }),
    __metadata("design:type", Number)
], Conversation.prototype, "unreadCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_customer_message_at', type: 'timestamp with time zone', nullable: true }),
    __metadata("design:type", Object)
], Conversation.prototype, "lastCustomerMessageAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Conversation.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => conversation_message_entity_1.ConversationMessage, (message) => message.conversation),
    __metadata("design:type", Array)
], Conversation.prototype, "messages", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => conversation_note_entity_1.ConversationNote, (note) => note.conversation),
    __metadata("design:type", Array)
], Conversation.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => conversation_assignment_entity_1.ConversationAssignment, (assignment) => assignment.conversation),
    __metadata("design:type", Array)
], Conversation.prototype, "assignments", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Conversation.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Conversation.prototype, "updatedAt", void 0);
exports.Conversation = Conversation = __decorate([
    (0, typeorm_1.Entity)('conversations'),
    (0, typeorm_1.Index)('UQ_conversations_tenant_customer_channel', ['tenantId', 'customerId', 'channelAccountId'], {
        unique: true,
    }),
    (0, typeorm_1.Index)('IDX_conversations_tenant_status', ['tenantId', 'status']),
    (0, typeorm_1.Index)('IDX_conversations_tenant_assigned_to', ['tenantId', 'assignedToId']),
    (0, typeorm_1.Index)('IDX_conversations_tenant_channel_account', ['tenantId', 'channelAccountId']),
    (0, typeorm_1.Index)('IDX_conversations_tenant_last_message_at', ['tenantId', 'lastMessageAt'])
], Conversation);
