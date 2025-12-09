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
exports.UpdateBroadcastDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const enums_1 = require("../enums");
const variable_config_dto_1 = require("./variable-config.dto");
const is_future_date_validator_1 = require("./validators/is-future-date.validator");
const custom_fields_validator_1 = require("../../customers/dto/custom-fields.validator");
/**
 * DTO for updating an existing broadcast.
 * All fields are optional. Only allowed when broadcast status is DRAFT or SCHEDULED.
 * Conditional validations apply based on recipientType and isImmediate.
 */
class UpdateBroadcastDto {
    name;
    description;
    templateId;
    templateLanguage;
    recipientType;
    groupId;
    customerIds;
    templateVariables;
    isImmediate;
    scheduledAt;
    timezone;
    customFields;
}
exports.UpdateBroadcastDto = UpdateBroadcastDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: 'Name must be at least 2 characters' }),
    (0, class_validator_1.MaxLength)(100, { message: 'Name must not exceed 100 characters' }),
    __metadata("design:type", String)
], UpdateBroadcastDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500, { message: 'Description must not exceed 500 characters' }),
    __metadata("design:type", String)
], UpdateBroadcastDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4', { message: 'Template ID must be a valid UUID' }),
    __metadata("design:type", String)
], UpdateBroadcastDto.prototype, "templateId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: 'Template language must be at least 2 characters' }),
    (0, class_validator_1.MaxLength)(10, { message: 'Template language must not exceed 10 characters' }),
    __metadata("design:type", String)
], UpdateBroadcastDto.prototype, "templateLanguage", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(enums_1.RecipientType, {
        message: 'Recipient type must be either "group" or "customers"',
    }),
    __metadata("design:type", String)
], UpdateBroadcastDto.prototype, "recipientType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((o) => o.recipientType === enums_1.RecipientType.GROUP),
    (0, class_validator_1.IsUUID)('4', { message: 'Group ID must be a valid UUID' }),
    __metadata("design:type", String)
], UpdateBroadcastDto.prototype, "groupId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((o) => o.recipientType === enums_1.RecipientType.CUSTOMERS),
    (0, class_validator_1.IsArray)({ message: 'Customer IDs must be an array' }),
    (0, class_validator_1.ArrayMinSize)(1, { message: 'At least one customer ID is required' }),
    (0, class_validator_1.ArrayMaxSize)(10000, { message: 'Cannot send to more than 10,000 customers at once' }),
    (0, class_validator_1.IsUUID)('4', { each: true, message: 'Each customer ID must be a valid UUID' }),
    __metadata("design:type", Array)
], UpdateBroadcastDto.prototype, "customerIds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => variable_config_dto_1.TemplateVariablesConfigDto),
    __metadata("design:type", variable_config_dto_1.TemplateVariablesConfigDto)
], UpdateBroadcastDto.prototype, "templateVariables", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)({ message: 'isImmediate must be a boolean' }),
    __metadata("design:type", Boolean)
], UpdateBroadcastDto.prototype, "isImmediate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((o) => o.isImmediate === false),
    (0, class_transformer_1.Type)(() => Date),
    (0, class_validator_1.IsDate)({ message: 'Scheduled time must be a valid date' }),
    (0, is_future_date_validator_1.IsFutureDate)({ message: 'Scheduled time must be in the future' }),
    __metadata("design:type", Date)
], UpdateBroadcastDto.prototype, "scheduledAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((o) => o.isImmediate === false),
    (0, class_validator_1.IsString)({ message: 'Timezone is required for scheduled broadcasts' }),
    __metadata("design:type", String)
], UpdateBroadcastDto.prototype, "timezone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, custom_fields_validator_1.IsValidCustomFields)({
        message: 'customFields must be an object with max 10KB, max 3 levels of nesting, max 50 keys, and only primitive values',
    }),
    __metadata("design:type", Object)
], UpdateBroadcastDto.prototype, "customFields", void 0);
