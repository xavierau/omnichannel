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
exports.Broadcast = void 0;
const typeorm_1 = require("typeorm");
const tenant_entity_1 = require("../tenants/tenant.entity");
const user_entity_1 = require("../users/user.entity");
const template_group_entity_1 = require("../templates/template-group.entity");
const group_entity_1 = require("../groups/group.entity");
const channel_account_entity_1 = require("../channel-accounts/channel-account.entity");
const enums_1 = require("./enums");
const enums_2 = require("../templates/enums");
let Broadcast = class Broadcast {
    id;
    tenantId;
    tenant;
    name;
    description;
    // Template Reference
    templateId;
    template;
    templateName;
    templateCategory;
    templateLanguage;
    // Channel Account - which WhatsApp number/provider to use
    channelAccountId;
    channelAccount;
    // Recipients
    recipientType;
    groupId;
    group;
    customerIds;
    totalRecipients;
    // Template Variables Configuration
    templateVariables;
    // Scheduling
    scheduledAt;
    isImmediate;
    timezone;
    // Status & Metrics
    status;
    sentCount;
    deliveredCount;
    readCount;
    failedCount;
    // Audit
    createdBy;
    creator;
    createdAt;
    updatedAt;
    startedAt;
    completedAt;
    previousStatus;
    // Custom Fields
    customFields;
};
exports.Broadcast = Broadcast;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Broadcast.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'tenant_id' }),
    __metadata("design:type", String)
], Broadcast.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => tenant_entity_1.Tenant, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'tenant_id' }),
    __metadata("design:type", tenant_entity_1.Tenant)
], Broadcast.prototype, "tenant", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], Broadcast.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Broadcast.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'template_id' }),
    __metadata("design:type", String)
], Broadcast.prototype, "templateId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => template_group_entity_1.WhatsAppTemplateGroup, { onDelete: 'SET NULL', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'template_id' }),
    __metadata("design:type", Object)
], Broadcast.prototype, "template", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'template_name', length: 255 }),
    __metadata("design:type", String)
], Broadcast.prototype, "templateName", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: enums_2.TemplateCategory,
        name: 'template_category',
    }),
    __metadata("design:type", String)
], Broadcast.prototype, "templateCategory", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'template_language', length: 10 }),
    __metadata("design:type", String)
], Broadcast.prototype, "templateLanguage", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'channel_account_id', nullable: true }),
    __metadata("design:type", Object)
], Broadcast.prototype, "channelAccountId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => channel_account_entity_1.ChannelAccount, { onDelete: 'SET NULL', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'channel_account_id' }),
    __metadata("design:type", Object)
], Broadcast.prototype, "channelAccount", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: enums_1.RecipientType,
        name: 'recipient_type',
    }),
    __metadata("design:type", String)
], Broadcast.prototype, "recipientType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'group_id', nullable: true }),
    __metadata("design:type", Object)
], Broadcast.prototype, "groupId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => group_entity_1.CustomerGroup, { onDelete: 'SET NULL', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'group_id' }),
    __metadata("design:type", Object)
], Broadcast.prototype, "group", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'customer_ids', nullable: true }),
    __metadata("design:type", Object)
], Broadcast.prototype, "customerIds", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_recipients', default: 0 }),
    __metadata("design:type", Number)
], Broadcast.prototype, "totalRecipients", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'template_variables' }),
    __metadata("design:type", Object)
], Broadcast.prototype, "templateVariables", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'scheduled_at', type: 'timestamp with time zone', nullable: true }),
    __metadata("design:type", Object)
], Broadcast.prototype, "scheduledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_immediate', default: false }),
    __metadata("design:type", Boolean)
], Broadcast.prototype, "isImmediate", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, default: 'UTC' }),
    __metadata("design:type", String)
], Broadcast.prototype, "timezone", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: enums_1.BroadcastStatus,
        default: enums_1.BroadcastStatus.DRAFT,
    }),
    __metadata("design:type", String)
], Broadcast.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sent_count', default: 0 }),
    __metadata("design:type", Number)
], Broadcast.prototype, "sentCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'delivered_count', default: 0 }),
    __metadata("design:type", Number)
], Broadcast.prototype, "deliveredCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'read_count', default: 0 }),
    __metadata("design:type", Number)
], Broadcast.prototype, "readCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'failed_count', default: 0 }),
    __metadata("design:type", Number)
], Broadcast.prototype, "failedCount", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'created_by' }),
    __metadata("design:type", String)
], Broadcast.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'SET NULL', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'created_by' }),
    __metadata("design:type", Object)
], Broadcast.prototype, "creator", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Broadcast.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Broadcast.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'started_at', type: 'timestamp with time zone', nullable: true }),
    __metadata("design:type", Object)
], Broadcast.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'completed_at', type: 'timestamp with time zone', nullable: true }),
    __metadata("design:type", Object)
], Broadcast.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: enums_1.BroadcastStatus,
        name: 'previous_status',
        nullable: true,
    }),
    __metadata("design:type", Object)
], Broadcast.prototype, "previousStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'custom_fields', nullable: true, default: {} }),
    __metadata("design:type", Object)
], Broadcast.prototype, "customFields", void 0);
exports.Broadcast = Broadcast = __decorate([
    (0, typeorm_1.Entity)('broadcasts'),
    (0, typeorm_1.Index)(['tenantId', 'status']),
    (0, typeorm_1.Index)(['tenantId', 'scheduledAt'])
], Broadcast);
