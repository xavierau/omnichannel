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
exports.ApiKey = void 0;
const typeorm_1 = require("typeorm");
const tenant_entity_1 = require("../../tenants/tenant.entity");
const channel_account_entity_1 = require("../../channel-accounts/channel-account.entity");
const user_entity_1 = require("../../users/user.entity");
/**
 * ApiKey entity represents an API key for AI agents to interact with the messaging platform.
 * Each key is scoped to a tenant and optionally to a specific channel account.
 * Keys are stored as SHA-256 hashes for security.
 */
let ApiKey = class ApiKey {
    id;
    tenantId;
    tenant;
    channelAccountId;
    channelAccount;
    name;
    keyHash;
    keyPrefix;
    permissions;
    expiresAt;
    lastUsedAt;
    isActive;
    createdById;
    createdBy;
    createdAt;
    updatedAt;
    /**
     * Check if the API key is valid for use.
     * A key is valid if it is active and not expired.
     */
    isValid() {
        if (!this.isActive) {
            return false;
        }
        if (this.expiresAt && new Date() >= this.expiresAt) {
            return false;
        }
        return true;
    }
    /**
     * Check if the API key has expired.
     */
    isExpired() {
        return this.expiresAt !== null && new Date() >= this.expiresAt;
    }
    /**
     * Check if the API key has a specific permission.
     */
    hasPermission(permission) {
        return this.permissions.includes(permission);
    }
    /**
     * Check if the API key has all of the specified permissions.
     */
    hasAllPermissions(permissions) {
        return permissions.every((p) => this.permissions.includes(p));
    }
    /**
     * Check if the API key has any of the specified permissions.
     */
    hasAnyPermission(permissions) {
        return permissions.some((p) => this.permissions.includes(p));
    }
};
exports.ApiKey = ApiKey;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ApiKey.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'tenant_id' }),
    __metadata("design:type", String)
], ApiKey.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => tenant_entity_1.Tenant, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'tenant_id' }),
    __metadata("design:type", tenant_entity_1.Tenant)
], ApiKey.prototype, "tenant", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'channel_account_id', nullable: true }),
    __metadata("design:type", Object)
], ApiKey.prototype, "channelAccountId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => channel_account_entity_1.ChannelAccount, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'channel_account_id' }),
    __metadata("design:type", Object)
], ApiKey.prototype, "channelAccount", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], ApiKey.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'key_hash', length: 64 }),
    __metadata("design:type", String)
], ApiKey.prototype, "keyHash", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'key_prefix', length: 16 }),
    __metadata("design:type", String)
], ApiKey.prototype, "keyPrefix", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', array: true }),
    __metadata("design:type", Array)
], ApiKey.prototype, "permissions", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expires_at', type: 'timestamp with time zone', nullable: true }),
    __metadata("design:type", Object)
], ApiKey.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_used_at', type: 'timestamp with time zone', nullable: true }),
    __metadata("design:type", Object)
], ApiKey.prototype, "lastUsedAt", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'is_active', default: true }),
    __metadata("design:type", Boolean)
], ApiKey.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by_id', nullable: true }),
    __metadata("design:type", Object)
], ApiKey.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'created_by_id' }),
    __metadata("design:type", Object)
], ApiKey.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], ApiKey.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], ApiKey.prototype, "updatedAt", void 0);
exports.ApiKey = ApiKey = __decorate([
    (0, typeorm_1.Entity)('api_keys'),
    (0, typeorm_1.Unique)(['tenantId', 'keyHash']),
    (0, typeorm_1.Index)(['tenantId', 'channelAccountId'])
], ApiKey);
