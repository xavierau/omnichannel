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
exports.CreateTemplateGroupDto = void 0;
const class_validator_1 = require("class-validator");
const enums_1 = require("../enums");
const custom_fields_validator_1 = require("../../customers/dto/custom-fields.validator");
/**
 * DTO for creating a new WhatsApp template group.
 * A template group contains translations of the same template in different languages.
 */
class CreateTemplateGroupDto {
    name;
    category;
    /**
     * Channel account this template belongs to.
     * Templates are approved per WABA (WhatsApp Business Account).
     */
    channelAccountId;
    customFields;
}
exports.CreateTemplateGroupDto = CreateTemplateGroupDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: 'Name must be at least 2 characters' }),
    (0, class_validator_1.MaxLength)(255, { message: 'Name must not exceed 255 characters' }),
    (0, class_validator_1.Matches)(/^[a-z0-9_]+$/, {
        message: 'Name must only contain lowercase letters, numbers, and underscores (WhatsApp requirement)',
    }),
    __metadata("design:type", String)
], CreateTemplateGroupDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(enums_1.TemplateCategory, { message: 'Category must be a valid TemplateCategory' }),
    __metadata("design:type", String)
], CreateTemplateGroupDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4', { message: 'channelAccountId must be a valid UUID' }),
    __metadata("design:type", String)
], CreateTemplateGroupDto.prototype, "channelAccountId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, custom_fields_validator_1.IsValidCustomFields)({
        message: 'customFields must be an object with max 10KB size, max 3 levels of nesting, max 50 keys, and only primitive values',
    }),
    __metadata("design:type", Object)
], CreateTemplateGroupDto.prototype, "customFields", void 0);
