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
exports.PresignedUrlDto = void 0;
const class_validator_1 = require("class-validator");
const media_entity_1 = require("../media.entity");
/**
 * Map MIME types to MediaType enum
 */
const MIME_TYPE_TO_MEDIA_TYPE = {
    // Images
    'image/jpeg': media_entity_1.MediaType.IMAGE,
    'image/jpg': media_entity_1.MediaType.IMAGE,
    'image/png': media_entity_1.MediaType.IMAGE,
    'image/gif': media_entity_1.MediaType.IMAGE,
    'image/webp': media_entity_1.MediaType.IMAGE,
    // Videos
    'video/mp4': media_entity_1.MediaType.VIDEO,
    'video/3gpp': media_entity_1.MediaType.VIDEO,
    'video/quicktime': media_entity_1.MediaType.VIDEO,
    // Documents
    'application/pdf': media_entity_1.MediaType.DOCUMENT,
    'application/msword': media_entity_1.MediaType.DOCUMENT,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': media_entity_1.MediaType.DOCUMENT,
    'application/vnd.ms-excel': media_entity_1.MediaType.DOCUMENT,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': media_entity_1.MediaType.DOCUMENT,
    'application/vnd.ms-powerpoint': media_entity_1.MediaType.DOCUMENT,
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': media_entity_1.MediaType.DOCUMENT,
    'text/plain': media_entity_1.MediaType.DOCUMENT,
    'text/csv': media_entity_1.MediaType.DOCUMENT,
    'application/zip': media_entity_1.MediaType.DOCUMENT,
    // Audio
    'audio/webm': media_entity_1.MediaType.DOCUMENT,
    'audio/ogg': media_entity_1.MediaType.DOCUMENT,
    'audio/mpeg': media_entity_1.MediaType.DOCUMENT,
    'audio/mp4': media_entity_1.MediaType.DOCUMENT,
};
/**
 * DTO for presigned URL requests
 *
 * Used when requesting a presigned URL for direct browser upload to S3.
 *
 * Accepts either:
 * - contentType (MIME type) + filename (frontend format)
 * - type (MediaType enum) + fileName (legacy format)
 */
class PresignedUrlDto {
    filename;
    contentType;
    conversationId;
    /**
     * Get the MediaType from contentType
     */
    getMediaType() {
        const mediaType = MIME_TYPE_TO_MEDIA_TYPE[this.contentType.toLowerCase()];
        if (!mediaType) {
            throw new Error(`Unsupported content type: ${this.contentType}`);
        }
        return mediaType;
    }
}
exports.PresignedUrlDto = PresignedUrlDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'filename must not be empty' }),
    (0, class_validator_1.MaxLength)(255, { message: 'filename must not exceed 255 characters' }),
    __metadata("design:type", String)
], PresignedUrlDto.prototype, "filename", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'contentType must not be empty' }),
    __metadata("design:type", String)
], PresignedUrlDto.prototype, "contentType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PresignedUrlDto.prototype, "conversationId", void 0);
