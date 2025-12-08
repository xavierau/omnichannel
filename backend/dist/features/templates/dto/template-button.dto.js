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
exports.TemplateButtonDto = void 0;
const class_validator_1 = require("class-validator");
const enums_1 = require("../enums");
/**
 * DTO for template button validation.
 * Buttons are used in WhatsApp template messages for quick actions.
 */
class TemplateButtonDto {
    type;
    text;
    url;
    phoneNumber;
}
exports.TemplateButtonDto = TemplateButtonDto;
__decorate([
    (0, class_validator_1.IsEnum)(enums_1.ButtonType, { message: 'Button type must be a valid ButtonType' }),
    __metadata("design:type", String)
], TemplateButtonDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(25, { message: 'Button text must not exceed 25 characters' }),
    __metadata("design:type", String)
], TemplateButtonDto.prototype, "text", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o.type === enums_1.ButtonType.URL),
    (0, class_validator_1.IsUrl)({}, { message: 'URL must be a valid URL' }),
    (0, class_validator_1.MaxLength)(2000, { message: 'URL must not exceed 2000 characters' }),
    __metadata("design:type", String)
], TemplateButtonDto.prototype, "url", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o.type === enums_1.ButtonType.CALL),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\+?\d{10,15}$/, {
        message: 'Phone number must be 10-15 digits, optionally prefixed with +',
    }),
    __metadata("design:type", String)
], TemplateButtonDto.prototype, "phoneNumber", void 0);
