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
exports.WhatsAppTemplateGroup = void 0;
const typeorm_1 = require("typeorm");
const tenant_entity_1 = require("../tenants/tenant.entity");
const channel_account_entity_1 = require("../channel-accounts/channel-account.entity");
const template_translation_entity_1 = require("./template-translation.entity");
const enums_1 = require("./enums");
let WhatsAppTemplateGroup = class WhatsAppTemplateGroup {
    id;
    tenantId;
    tenant;
    /**
     * Channel account this template belongs to.
     * Templates are approved per WABA (WhatsApp Business Account),
     * so each channel account has its own set of approved templates.
     */
    channelAccountId;
    channelAccount;
    name;
    category;
    customFields;
    translations;
    createdAt;
    updatedAt;
};
exports.WhatsAppTemplateGroup = WhatsAppTemplateGroup;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], WhatsAppTemplateGroup.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'tenant_id' }),
    __metadata("design:type", String)
], WhatsAppTemplateGroup.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => tenant_entity_1.Tenant, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'tenant_id' }),
    __metadata("design:type", tenant_entity_1.Tenant)
], WhatsAppTemplateGroup.prototype, "tenant", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'channel_account_id', nullable: true }),
    __metadata("design:type", Object)
], WhatsAppTemplateGroup.prototype, "channelAccountId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => channel_account_entity_1.ChannelAccount, { onDelete: 'SET NULL', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'channel_account_id' }),
    __metadata("design:type", Object)
], WhatsAppTemplateGroup.prototype, "channelAccount", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], WhatsAppTemplateGroup.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: enums_1.TemplateCategory,
    }),
    __metadata("design:type", String)
], WhatsAppTemplateGroup.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'custom_fields', nullable: true, default: {} }),
    __metadata("design:type", Object)
], WhatsAppTemplateGroup.prototype, "customFields", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => template_translation_entity_1.TemplateTranslation, (translation) => translation.templateGroup),
    __metadata("design:type", Array)
], WhatsAppTemplateGroup.prototype, "translations", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], WhatsAppTemplateGroup.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], WhatsAppTemplateGroup.prototype, "updatedAt", void 0);
exports.WhatsAppTemplateGroup = WhatsAppTemplateGroup = __decorate([
    (0, typeorm_1.Entity)('whatsapp_template_groups'),
    (0, typeorm_1.Index)(['tenantId', 'channelAccountId', 'name'], { unique: true })
], WhatsAppTemplateGroup);
