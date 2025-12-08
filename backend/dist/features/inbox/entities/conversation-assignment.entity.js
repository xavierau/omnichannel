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
exports.ConversationAssignment = void 0;
const typeorm_1 = require("typeorm");
const tenant_entity_1 = require("../../tenants/tenant.entity");
const user_entity_1 = require("../../users/user.entity");
const conversation_entity_1 = require("./conversation.entity");
const enums_1 = require("../enums");
/**
 * ConversationAssignment entity provides an audit trail for conversation
 * assignment changes.
 *
 * This table is append-only - assignments are never updated or deleted,
 * providing a complete history of who handled the conversation.
 */
let ConversationAssignment = class ConversationAssignment {
    id;
    tenantId;
    tenant;
    conversationId;
    conversation;
    fromUserId;
    fromUser;
    toUserId;
    toUser;
    action;
    performedById;
    performedBy;
    reason;
    createdAt;
};
exports.ConversationAssignment = ConversationAssignment;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ConversationAssignment.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id' }),
    __metadata("design:type", String)
], ConversationAssignment.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => tenant_entity_1.Tenant, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'tenant_id' }),
    __metadata("design:type", tenant_entity_1.Tenant)
], ConversationAssignment.prototype, "tenant", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'conversation_id' }),
    __metadata("design:type", String)
], ConversationAssignment.prototype, "conversationId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => conversation_entity_1.Conversation, (conversation) => conversation.assignments, {
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'conversation_id' }),
    __metadata("design:type", conversation_entity_1.Conversation)
], ConversationAssignment.prototype, "conversation", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'from_user_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], ConversationAssignment.prototype, "fromUserId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'from_user_id' }),
    __metadata("design:type", Object)
], ConversationAssignment.prototype, "fromUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'to_user_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], ConversationAssignment.prototype, "toUserId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'to_user_id' }),
    __metadata("design:type", Object)
], ConversationAssignment.prototype, "toUser", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: enums_1.AssignmentAction,
        enumName: 'assignment_action',
    }),
    __metadata("design:type", String)
], ConversationAssignment.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'performed_by_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], ConversationAssignment.prototype, "performedById", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'performed_by_id' }),
    __metadata("design:type", Object)
], ConversationAssignment.prototype, "performedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], ConversationAssignment.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ConversationAssignment.prototype, "createdAt", void 0);
exports.ConversationAssignment = ConversationAssignment = __decorate([
    (0, typeorm_1.Entity)('conversation_assignments'),
    (0, typeorm_1.Index)('IDX_conversation_assignments_tenant_conversation_created', [
        'tenantId',
        'conversationId',
        'createdAt',
    ])
], ConversationAssignment);
