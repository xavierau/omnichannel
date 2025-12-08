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
exports.CustomFieldResponseDto = exports.ReorderCustomFieldsDto = exports.UpdateCustomFieldDto = exports.CreateCustomFieldDto = exports.OptionDto = exports.ValidationDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const custom_field_entity_1 = require("../custom-field.entity");
/**
 * DTO for validation rules.
 */
class ValidationDto {
    required;
    minLength;
    maxLength;
    pattern;
    patternMessage;
    min;
    max;
    decimal;
    precision;
}
exports.ValidationDto = ValidationDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ValidationDto.prototype, "required", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ValidationDto.prototype, "minLength", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ValidationDto.prototype, "maxLength", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], ValidationDto.prototype, "pattern", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], ValidationDto.prototype, "patternMessage", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ValidationDto.prototype, "min", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ValidationDto.prototype, "max", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ValidationDto.prototype, "decimal", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ValidationDto.prototype, "precision", void 0);
/**
 * DTO for select/multiselect options.
 */
class OptionDto {
    id;
    label;
    value;
    color;
    order;
}
exports.OptionDto = OptionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    __metadata("design:type", String)
], OptionDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], OptionDto.prototype, "label", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], OptionDto.prototype, "value", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], OptionDto.prototype, "color", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], OptionDto.prototype, "order", void 0);
/**
 * DTO for creating a custom field.
 */
class CreateCustomFieldDto {
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
}
exports.CreateCustomFieldDto = CreateCustomFieldDto;
__decorate([
    (0, class_validator_1.IsEnum)(custom_field_entity_1.CustomFieldEntityType, {
        message: `Entity type must be one of: ${Object.values(custom_field_entity_1.CustomFieldEntityType).join(', ')}`,
    }),
    __metadata("design:type", String)
], CreateCustomFieldDto.prototype, "entityType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateCustomFieldDto.prototype, "fieldKey", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateCustomFieldDto.prototype, "displayLabel", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], CreateCustomFieldDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(custom_field_entity_1.CustomFieldType, {
        message: `Field type must be one of: ${Object.values(custom_field_entity_1.CustomFieldType).join(', ')}`,
    }),
    __metadata("design:type", String)
], CreateCustomFieldDto.prototype, "fieldType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ValidationDto),
    __metadata("design:type", ValidationDto)
], CreateCustomFieldDto.prototype, "validation", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateCustomFieldDto.prototype, "defaultValue", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => OptionDto),
    __metadata("design:type", Array)
], CreateCustomFieldDto.prototype, "options", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateCustomFieldDto.prototype, "displayOrder", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateCustomFieldDto.prototype, "isVisible", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateCustomFieldDto.prototype, "isSearchable", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateCustomFieldDto.prototype, "isFilterable", void 0);
/**
 * DTO for updating a custom field.
 */
class UpdateCustomFieldDto {
    displayLabel;
    description;
    validation;
    defaultValue;
    options;
    displayOrder;
    isVisible;
    isSearchable;
    isFilterable;
}
exports.UpdateCustomFieldDto = UpdateCustomFieldDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], UpdateCustomFieldDto.prototype, "displayLabel", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], UpdateCustomFieldDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ValidationDto),
    __metadata("design:type", ValidationDto)
], UpdateCustomFieldDto.prototype, "validation", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateCustomFieldDto.prototype, "defaultValue", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => OptionDto),
    __metadata("design:type", Array)
], UpdateCustomFieldDto.prototype, "options", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateCustomFieldDto.prototype, "displayOrder", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateCustomFieldDto.prototype, "isVisible", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateCustomFieldDto.prototype, "isSearchable", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateCustomFieldDto.prototype, "isFilterable", void 0);
/**
 * DTO for reordering custom fields.
 */
class ReorderCustomFieldsDto {
    entityType;
    orderedIds;
}
exports.ReorderCustomFieldsDto = ReorderCustomFieldsDto;
__decorate([
    (0, class_validator_1.IsEnum)(custom_field_entity_1.CustomFieldEntityType, {
        message: `Entity type must be one of: ${Object.values(custom_field_entity_1.CustomFieldEntityType).join(', ')}`,
    }),
    __metadata("design:type", String)
], ReorderCustomFieldsDto.prototype, "entityType", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.IsUUID)('4', { each: true }),
    __metadata("design:type", Array)
], ReorderCustomFieldsDto.prototype, "orderedIds", void 0);
/**
 * Response DTO for custom fields.
 */
class CustomFieldResponseDto {
    id;
    tenantId;
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
    static fromEntity(entity) {
        const dto = new CustomFieldResponseDto();
        dto.id = entity.id;
        dto.tenantId = entity.tenantId;
        dto.entityType = entity.entityType;
        dto.fieldKey = entity.fieldKey;
        dto.displayLabel = entity.displayLabel;
        dto.description = entity.description;
        dto.fieldType = entity.fieldType;
        dto.validation = entity.validation;
        dto.defaultValue = entity.defaultValue;
        dto.options = entity.options;
        dto.displayOrder = entity.displayOrder;
        dto.isVisible = entity.isVisible;
        dto.isSearchable = entity.isSearchable;
        dto.isFilterable = entity.isFilterable;
        dto.createdAt = entity.createdAt;
        dto.updatedAt = entity.updatedAt;
        return dto;
    }
}
exports.CustomFieldResponseDto = CustomFieldResponseDto;
