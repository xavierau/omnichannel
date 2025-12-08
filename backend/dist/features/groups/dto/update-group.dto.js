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
exports.UpdateGroupDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const create_group_dto_1 = require("./create-group.dto");
/**
 * DTO for updating an existing customer group.
 *
 * All fields are optional. Validation rules:
 * - name: 2-255 characters if provided
 * - description: max 500 characters if provided
 * - isStatic: boolean if provided
 * - memberIds: required if isStatic is being set to true
 * - criteria: required if isStatic is being set to false
 *
 * Note: Changing a group from static to dynamic (or vice versa) requires
 * providing the appropriate memberIds or criteria.
 */
class UpdateGroupDto {
    name;
    description;
    isStatic;
    memberIds;
    criteria;
}
exports.UpdateGroupDto = UpdateGroupDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: 'Name must be at least 2 characters' }),
    (0, class_validator_1.MaxLength)(255, { message: 'Name must not exceed 255 characters' }),
    __metadata("design:type", String)
], UpdateGroupDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500, { message: 'Description must not exceed 500 characters' }),
    __metadata("design:type", String)
], UpdateGroupDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)({ message: 'isStatic must be a boolean value' }),
    __metadata("design:type", Boolean)
], UpdateGroupDto.prototype, "isStatic", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((o) => o.isStatic === true),
    (0, class_validator_1.IsArray)({ message: 'memberIds must be an array' }),
    (0, class_validator_1.IsUUID)('4', { each: true, message: 'Each member ID must be a valid UUID' }),
    __metadata("design:type", Array)
], UpdateGroupDto.prototype, "memberIds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((o) => o.isStatic === false),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => create_group_dto_1.GroupCriteriaDto),
    __metadata("design:type", create_group_dto_1.GroupCriteriaDto)
], UpdateGroupDto.prototype, "criteria", void 0);
