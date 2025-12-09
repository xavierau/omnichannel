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
exports.TemplateTranslation = void 0;
const typeorm_1 = require("typeorm");
const template_group_entity_1 = require("./template-group.entity");
const enums_1 = require("./enums");
let TemplateTranslation = class TemplateTranslation {
    id;
    templateGroupId;
    templateGroup;
    language;
    status;
    quality;
    headerType;
    headerContent;
    body;
    footer;
    buttons;
    rejectionReason;
    metaTemplateId;
    createdAt;
    updatedAt;
};
exports.TemplateTranslation = TemplateTranslation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TemplateTranslation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'template_group_id' }),
    __metadata("design:type", String)
], TemplateTranslation.prototype, "templateGroupId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => template_group_entity_1.WhatsAppTemplateGroup, (group) => group.translations, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'template_group_id' }),
    __metadata("design:type", template_group_entity_1.WhatsAppTemplateGroup)
], TemplateTranslation.prototype, "templateGroup", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 10 }),
    __metadata("design:type", String)
], TemplateTranslation.prototype, "language", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: enums_1.TemplateStatus,
        default: enums_1.TemplateStatus.PENDING,
    }),
    __metadata("design:type", String)
], TemplateTranslation.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: enums_1.TemplateQuality,
        nullable: true,
    }),
    __metadata("design:type", Object)
], TemplateTranslation.prototype, "quality", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: enums_1.HeaderType,
        name: 'header_type',
        nullable: true,
    }),
    __metadata("design:type", Object)
], TemplateTranslation.prototype, "headerType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'header_content', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], TemplateTranslation.prototype, "headerContent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], TemplateTranslation.prototype, "body", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], TemplateTranslation.prototype, "footer", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: [] }),
    __metadata("design:type", Array)
], TemplateTranslation.prototype, "buttons", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rejection_reason', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], TemplateTranslation.prototype, "rejectionReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'meta_template_id', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", Object)
], TemplateTranslation.prototype, "metaTemplateId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], TemplateTranslation.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], TemplateTranslation.prototype, "updatedAt", void 0);
exports.TemplateTranslation = TemplateTranslation = __decorate([
    (0, typeorm_1.Entity)('template_translations'),
    (0, typeorm_1.Index)(['templateGroupId', 'language'], { unique: true })
], TemplateTranslation);
