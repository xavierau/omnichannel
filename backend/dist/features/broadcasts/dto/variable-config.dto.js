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
exports.TemplateVariablesConfigDto = exports.ButtonVariableConfigDto = exports.HeaderConfigDto = exports.VariableConfigDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
/**
 * DTO for configuring a single template variable.
 * Variables can be either static values or dynamically sourced from customer fields.
 */
class VariableConfigDto {
    index;
    sourceType;
    staticValue;
    customerField;
}
exports.VariableConfigDto = VariableConfigDto;
__decorate([
    (0, class_validator_1.IsInt)({ message: 'Variable index must be a positive integer' }),
    (0, class_validator_1.Min)(1, { message: 'Variable index must be at least 1' }),
    __metadata("design:type", Number)
], VariableConfigDto.prototype, "index", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['static', 'customer_field'], {
        message: 'Source type must be either "static" or "customer_field"',
    }),
    __metadata("design:type", String)
], VariableConfigDto.prototype, "sourceType", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o.sourceType === 'static'),
    (0, class_validator_1.IsString)({ message: 'Static value is required when source type is "static"' }),
    __metadata("design:type", String)
], VariableConfigDto.prototype, "staticValue", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o.sourceType === 'customer_field'),
    (0, class_validator_1.IsString)({ message: 'Customer field is required when source type is "customer_field"' }),
    __metadata("design:type", String)
], VariableConfigDto.prototype, "customerField", void 0);
/**
 * DTO for configuring header content in templates.
 * Supports text headers with variables or media headers with URLs.
 */
class HeaderConfigDto {
    type;
    textVariable;
    mediaUrl;
}
exports.HeaderConfigDto = HeaderConfigDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['text', 'image', 'video', 'document'], {
        message: 'Header type must be one of: text, image, video, document',
    }),
    __metadata("design:type", String)
], HeaderConfigDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o.type === 'text'),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => VariableConfigDto),
    __metadata("design:type", VariableConfigDto)
], HeaderConfigDto.prototype, "textVariable", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o.type !== 'text'),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)({ protocols: ['https'], require_protocol: true }, { message: 'Media URL must be a valid HTTPS URL' }),
    __metadata("design:type", String)
], HeaderConfigDto.prototype, "mediaUrl", void 0);
/**
 * DTO for configuring button variables in templates.
 * Maps variables to specific buttons by index.
 */
class ButtonVariableConfigDto {
    buttonIndex;
    variable;
}
exports.ButtonVariableConfigDto = ButtonVariableConfigDto;
__decorate([
    (0, class_validator_1.IsInt)({ message: 'Button index must be a non-negative integer' }),
    (0, class_validator_1.Min)(0, { message: 'Button index must be at least 0' }),
    __metadata("design:type", Number)
], ButtonVariableConfigDto.prototype, "buttonIndex", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => VariableConfigDto),
    __metadata("design:type", VariableConfigDto)
], ButtonVariableConfigDto.prototype, "variable", void 0);
/**
 * DTO for the complete template variables configuration.
 * Contains all variable mappings for header, body, and buttons.
 */
class TemplateVariablesConfigDto {
    header;
    bodyVariables;
    buttonVariables;
}
exports.TemplateVariablesConfigDto = TemplateVariablesConfigDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => HeaderConfigDto),
    __metadata("design:type", HeaderConfigDto)
], TemplateVariablesConfigDto.prototype, "header", void 0);
__decorate([
    (0, class_validator_1.IsArray)({ message: 'Body variables must be an array' }),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => VariableConfigDto),
    __metadata("design:type", Array)
], TemplateVariablesConfigDto.prototype, "bodyVariables", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)({ message: 'Button variables must be an array' }),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ButtonVariableConfigDto),
    __metadata("design:type", Array)
], TemplateVariablesConfigDto.prototype, "buttonVariables", void 0);
