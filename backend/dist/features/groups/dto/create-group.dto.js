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
exports.CreateGroupDto = exports.GroupCriteriaDto = exports.CustomFieldConditionDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
/**
 * Represents a custom field condition for dynamic group criteria.
 */
class CustomFieldConditionDto {
    fieldKey;
    operator;
    value;
}
exports.CustomFieldConditionDto = CustomFieldConditionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Field key is required' }),
    (0, class_validator_1.MaxLength)(100, { message: 'Field key must not exceed 100 characters' }),
    __metadata("design:type", String)
], CustomFieldConditionDto.prototype, "fieldKey", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['equals', 'contains', 'greaterThan', 'lessThan'], {
        message: 'Operator must be one of: equals, contains, greaterThan, lessThan',
    }),
    __metadata("design:type", String)
], CustomFieldConditionDto.prototype, "operator", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'Value is required' }),
    __metadata("design:type", Object)
], CustomFieldConditionDto.prototype, "value", void 0);
/**
 * Represents criteria for dynamic group membership resolution.
 */
class GroupCriteriaDto {
    tagIds;
    createdAfter;
    createdBefore;
    customFieldConditions;
}
exports.GroupCriteriaDto = GroupCriteriaDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUUID)('4', { each: true, message: 'Each tag ID must be a valid UUID' }),
    __metadata("design:type", Array)
], GroupCriteriaDto.prototype, "tagIds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)({}, { message: 'createdAfter must be a valid ISO date string' }),
    __metadata("design:type", String)
], GroupCriteriaDto.prototype, "createdAfter", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)({}, { message: 'createdBefore must be a valid ISO date string' }),
    __metadata("design:type", String)
], GroupCriteriaDto.prototype, "createdBefore", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CustomFieldConditionDto),
    __metadata("design:type", Array)
], GroupCriteriaDto.prototype, "customFieldConditions", void 0);
/**
 * DTO for creating a new customer group.
 *
 * Validation rules:
 * - name: required, 2-255 characters
 * - description: optional, max 500 characters
 * - isStatic: required boolean
 * - memberIds: required if isStatic=true (array of customer UUIDs)
 * - criteria: required if isStatic=false (dynamic group criteria)
 */
class CreateGroupDto {
    name;
    description;
    isStatic;
    memberIds;
    criteria;
}
exports.CreateGroupDto = CreateGroupDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: 'Name must be at least 2 characters' }),
    (0, class_validator_1.MaxLength)(255, { message: 'Name must not exceed 255 characters' }),
    __metadata("design:type", String)
], CreateGroupDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500, { message: 'Description must not exceed 500 characters' }),
    __metadata("design:type", String)
], CreateGroupDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)({ message: 'isStatic must be a boolean value' }),
    __metadata("design:type", Boolean)
], CreateGroupDto.prototype, "isStatic", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o.isStatic === true),
    (0, class_validator_1.IsArray)({ message: 'memberIds must be an array when isStatic is true' }),
    (0, class_validator_1.ArrayNotEmpty)({ message: 'memberIds must not be empty for static groups' }),
    (0, class_validator_1.IsUUID)('4', { each: true, message: 'Each member ID must be a valid UUID' }),
    __metadata("design:type", Array)
], CreateGroupDto.prototype, "memberIds", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o.isStatic === false),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => GroupCriteriaDto),
    (0, class_validator_1.IsNotEmpty)({ message: 'criteria is required for dynamic groups' }),
    __metadata("design:type", GroupCriteriaDto)
], CreateGroupDto.prototype, "criteria", void 0);
