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
exports.AgentSendMessageDto = exports.AgentTemplateContentDto = exports.AgentMediaContentDto = exports.AgentTextContentDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const enums_1 = require("../../inbox/enums");
/**
 * Text content for a text message.
 */
class AgentTextContentDto {
    content;
}
exports.AgentTextContentDto = AgentTextContentDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(4096, { message: 'Text content must not exceed 4096 characters' }),
    __metadata("design:type", String)
], AgentTextContentDto.prototype, "content", void 0);
/**
 * Media content for image, document, or audio messages.
 */
class AgentMediaContentDto {
    url;
    mimeType;
    caption;
    filename;
}
exports.AgentMediaContentDto = AgentMediaContentDto;
__decorate([
    (0, class_validator_1.IsUrl)({}, { message: 'Media URL must be a valid URL' }),
    __metadata("design:type", String)
], AgentMediaContentDto.prototype, "url", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255, { message: 'MIME type must not exceed 255 characters' }),
    __metadata("design:type", String)
], AgentMediaContentDto.prototype, "mimeType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1024, { message: 'Caption must not exceed 1024 characters' }),
    __metadata("design:type", String)
], AgentMediaContentDto.prototype, "caption", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255, { message: 'Filename must not exceed 255 characters' }),
    __metadata("design:type", String)
], AgentMediaContentDto.prototype, "filename", void 0);
/**
 * Template content for template messages.
 */
class AgentTemplateContentDto {
    name;
    language;
    variables;
}
exports.AgentTemplateContentDto = AgentTemplateContentDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(512, { message: 'Template name must not exceed 512 characters' }),
    __metadata("design:type", String)
], AgentTemplateContentDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(10, { message: 'Language code must not exceed 10 characters' }),
    __metadata("design:type", String)
], AgentTemplateContentDto.prototype, "language", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], AgentTemplateContentDto.prototype, "variables", void 0);
/**
 * DTO for sending a message in a conversation via Agent API.
 *
 * Supports content types:
 * - TEXT: Requires text.content
 * - IMAGE, DOCUMENT, AUDIO: Requires media.url
 * - TEMPLATE: Requires template.name and template.language
 *
 * AI agents typically use templates for outbound messages outside the
 * 24-hour messaging window, and freeform messages when responding to
 * customer messages within the window.
 */
class AgentSendMessageDto {
    contentType;
    text;
    media;
    template;
}
exports.AgentSendMessageDto = AgentSendMessageDto;
__decorate([
    (0, class_validator_1.IsEnum)(enums_1.MessageContentType, {
        message: 'contentType must be one of: text, image, document, audio, template',
    }),
    __metadata("design:type", String)
], AgentSendMessageDto.prototype, "contentType", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o.contentType === enums_1.MessageContentType.TEXT),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => AgentTextContentDto),
    __metadata("design:type", AgentTextContentDto)
], AgentSendMessageDto.prototype, "text", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o.contentType === enums_1.MessageContentType.IMAGE ||
        o.contentType === enums_1.MessageContentType.DOCUMENT ||
        o.contentType === enums_1.MessageContentType.AUDIO),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => AgentMediaContentDto),
    __metadata("design:type", AgentMediaContentDto)
], AgentSendMessageDto.prototype, "media", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o.contentType === enums_1.MessageContentType.TEMPLATE),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => AgentTemplateContentDto),
    __metadata("design:type", AgentTemplateContentDto)
], AgentSendMessageDto.prototype, "template", void 0);
