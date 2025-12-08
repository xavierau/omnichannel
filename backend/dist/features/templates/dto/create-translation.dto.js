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
exports.CreateTranslationDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const enums_1 = require("../enums");
const template_button_dto_1 = require("./template-button.dto");
/**
 * DTO for creating a template translation.
 * Each translation represents the template content in a specific language.
 */
class CreateTranslationDto {
    language;
    headerType;
    headerContent;
    body;
    footer;
    buttons;
}
exports.CreateTranslationDto = CreateTranslationDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: 'Language code must be at least 2 characters' }),
    (0, class_validator_1.MaxLength)(10, { message: 'Language code must not exceed 10 characters' }),
    __metadata("design:type", String)
], CreateTranslationDto.prototype, "language", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(enums_1.HeaderType, { message: 'Header type must be a valid HeaderType' }),
    __metadata("design:type", String)
], CreateTranslationDto.prototype, "headerType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1024, { message: 'Header content must not exceed 1024 characters' }),
    __metadata("design:type", String)
], CreateTranslationDto.prototype, "headerContent", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'Body is required' }),
    (0, class_validator_1.MaxLength)(1024, { message: 'Body must not exceed 1024 characters' }),
    __metadata("design:type", String)
], CreateTranslationDto.prototype, "body", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(60, { message: 'Footer must not exceed 60 characters' }),
    __metadata("design:type", String)
], CreateTranslationDto.prototype, "footer", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(3, { message: 'Maximum of 3 buttons allowed' }),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => template_button_dto_1.TemplateButtonDto),
    __metadata("design:type", Array)
], CreateTranslationDto.prototype, "buttons", void 0);
