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
exports.Provider = void 0;
const typeorm_1 = require("typeorm");
const channel_entity_1 = require("../channels/channel.entity");
/**
 * Provider entity represents messaging providers (Meta, Twilio, etc.).
 * Providers are system-level definitions linked to a channel type.
 */
let Provider = class Provider {
    id;
    channelId;
    channel;
    code; // 'meta_cloud_api', 'twilio_whatsapp', 'dialogue360', 'infobip'
    name; // 'Meta Cloud API', 'Twilio WhatsApp', etc.
    description;
    configSchema;
    webhookConfig;
    isActive;
    supportsTemplates;
    rateLimits;
    createdAt;
    updatedAt;
};
exports.Provider = Provider;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Provider.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'channel_id' }),
    __metadata("design:type", String)
], Provider.prototype, "channelId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => channel_entity_1.Channel, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'channel_id' }),
    __metadata("design:type", channel_entity_1.Channel)
], Provider.prototype, "channel", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50 }),
    __metadata("design:type", String)
], Provider.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], Provider.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Provider.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'config_schema' }),
    __metadata("design:type", Object)
], Provider.prototype, "configSchema", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'webhook_config', nullable: true }),
    __metadata("design:type", Object)
], Provider.prototype, "webhookConfig", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true }),
    __metadata("design:type", Boolean)
], Provider.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'supports_templates', default: true }),
    __metadata("design:type", Boolean)
], Provider.prototype, "supportsTemplates", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'rate_limits', nullable: true }),
    __metadata("design:type", Object)
], Provider.prototype, "rateLimits", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Provider.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Provider.prototype, "updatedAt", void 0);
exports.Provider = Provider = __decorate([
    (0, typeorm_1.Entity)('providers'),
    (0, typeorm_1.Index)(['code'], { unique: true })
], Provider);
