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
exports.CustomFieldDefinition = exports.CustomFieldType = exports.CustomFieldEntityType = void 0;
const typeorm_1 = require("typeorm");
const tenant_entity_1 = require("../tenants/tenant.entity");
/**
 * Entity types that can have custom fields.
 */
var CustomFieldEntityType;
(function (CustomFieldEntityType) {
    CustomFieldEntityType["CUSTOMER"] = "CUSTOMER";
    CustomFieldEntityType["BROADCAST"] = "BROADCAST";
    CustomFieldEntityType["TEMPLATE"] = "TEMPLATE";
    CustomFieldEntityType["CONVERSATION"] = "CONVERSATION";
})(CustomFieldEntityType || (exports.CustomFieldEntityType = CustomFieldEntityType = {}));
/**
 * Supported field types for custom fields.
 */
var CustomFieldType;
(function (CustomFieldType) {
    CustomFieldType["TEXT"] = "TEXT";
    CustomFieldType["TEXTAREA"] = "TEXTAREA";
    CustomFieldType["NUMBER"] = "NUMBER";
    CustomFieldType["DATE"] = "DATE";
    CustomFieldType["DATETIME"] = "DATETIME";
    CustomFieldType["SELECT"] = "SELECT";
    CustomFieldType["MULTISELECT"] = "MULTISELECT";
    CustomFieldType["BOOLEAN"] = "BOOLEAN";
    CustomFieldType["PHONE"] = "PHONE";
    CustomFieldType["EMAIL"] = "EMAIL";
    CustomFieldType["URL"] = "URL";
})(CustomFieldType || (exports.CustomFieldType = CustomFieldType = {}));
/**
 * CustomFieldDefinition entity represents a tenant-defined custom field.
 *
 * Custom fields allow tenants to extend entities (Customer, Broadcast, etc.)
 * with additional data fields specific to their business needs.
 */
let CustomFieldDefinition = class CustomFieldDefinition {
    id;
    tenantId;
    tenant;
    entityType;
    fieldKey;
    displayLabel;
    description;
    fieldType;
    validation;
    defaultValue;
    options;
    displayOrder;
    isVisible;
    isSearchable;
    isFilterable;
    createdAt;
    updatedAt;
};
exports.CustomFieldDefinition = CustomFieldDefinition;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CustomFieldDefinition.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'tenant_id' }),
    __metadata("design:type", String)
], CustomFieldDefinition.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => tenant_entity_1.Tenant, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'tenant_id' }),
    __metadata("design:type", tenant_entity_1.Tenant)
], CustomFieldDefinition.prototype, "tenant", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({
        name: 'entity_type',
        type: 'enum',
        enum: CustomFieldEntityType,
    }),
    __metadata("design:type", String)
], CustomFieldDefinition.prototype, "entityType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'field_key', type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], CustomFieldDefinition.prototype, "fieldKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'display_label', type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], CustomFieldDefinition.prototype, "displayLabel", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], CustomFieldDefinition.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'field_type',
        type: 'enum',
        enum: CustomFieldType,
    }),
    __metadata("design:type", String)
], CustomFieldDefinition.prototype, "fieldType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: '{}' }),
    __metadata("design:type", Object)
], CustomFieldDefinition.prototype, "validation", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'default_value', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], CustomFieldDefinition.prototype, "defaultValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], CustomFieldDefinition.prototype, "options", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'display_order', type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], CustomFieldDefinition.prototype, "displayOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_visible', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], CustomFieldDefinition.prototype, "isVisible", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_searchable', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], CustomFieldDefinition.prototype, "isSearchable", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_filterable', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], CustomFieldDefinition.prototype, "isFilterable", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], CustomFieldDefinition.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], CustomFieldDefinition.prototype, "updatedAt", void 0);
exports.CustomFieldDefinition = CustomFieldDefinition = __decorate([
    (0, typeorm_1.Entity)('custom_field_definitions'),
    (0, typeorm_1.Index)(['tenantId', 'entityType']),
    (0, typeorm_1.Index)(['tenantId', 'entityType', 'fieldKey'], { unique: true })
], CustomFieldDefinition);
