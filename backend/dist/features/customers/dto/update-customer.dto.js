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
exports.UpdateCustomerDto = void 0;
const class_validator_1 = require("class-validator");
const custom_fields_validator_1 = require("./custom-fields.validator");
class UpdateCustomerDto {
    name;
    whatsappNumber;
    tagIds;
    customFields;
}
exports.UpdateCustomerDto = UpdateCustomerDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: 'Name must be at least 2 characters' }),
    (0, class_validator_1.MaxLength)(255, { message: 'Name must not exceed 255 characters' }),
    __metadata("design:type", String)
], UpdateCustomerDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{10,15}$/, {
        message: 'WhatsApp number must be 10-15 digits (numbers only)',
    }),
    __metadata("design:type", String)
], UpdateCustomerDto.prototype, "whatsappNumber", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUUID)('4', { each: true, message: 'Each tag ID must be a valid UUID' }),
    __metadata("design:type", Array)
], UpdateCustomerDto.prototype, "tagIds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, custom_fields_validator_1.IsValidCustomFields)({
        message: 'customFields must be an object with max 10KB size, max 3 levels of nesting, max 50 keys, and only primitive values (string, number, boolean, null)',
    }),
    __metadata("design:type", Object)
], UpdateCustomerDto.prototype, "customFields", void 0);
