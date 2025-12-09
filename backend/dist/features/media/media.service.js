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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaService = void 0;
const tsyringe_1 = require("tsyringe");
const uuid_1 = require("uuid");
const media_repository_1 = require("./media.repository");
const media_entity_1 = require("./media.entity");
const s3_config_1 = require("../../config/s3.config");
const http_exceptions_1 = require("../../shared/exceptions/http-exceptions");
const logger_config_1 = require("../../config/logger.config");
/**
 * Media type configurations with file validation rules
 *
 * Security: Uses magic bytes validation to prevent MIME type spoofing
 */
const MEDIA_TYPE_CONFIG = {
    [media_entity_1.MediaType.IMAGE]: {
        allowedExtensions: ['.jpg', '.jpeg', '.png'],
        allowedMimeTypes: ['image/jpeg', 'image/png'],
        maxSizeBytes: 5 * 1024 * 1024, // 5MB
        magicBytes: [
            // JPEG: FFD8FF
            { bytes: [0xff, 0xd8, 0xff], offset: 0 },
            // PNG: 89504E47
            { bytes: [0x89, 0x50, 0x4e, 0x47], offset: 0 },
        ],
    },
    [media_entity_1.MediaType.VIDEO]: {
        allowedExtensions: ['.mp4'],
        allowedMimeTypes: ['video/mp4'],
        maxSizeBytes: 16 * 1024 * 1024, // 16MB
        magicBytes: [
            // MP4: ftyp at offset 4
            { bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 },
            // MP4: moov box - alternative start
            { bytes: [0x00, 0x00, 0x00], offset: 0 },
        ],
    },
    [media_entity_1.MediaType.DOCUMENT]: {
        allowedExtensions: ['.pdf'],
        allowedMimeTypes: ['application/pdf'],
        maxSizeBytes: 100 * 1024 * 1024, // 100MB
        magicBytes: [
            // PDF: %PDF
            { bytes: [0x25, 0x50, 0x44, 0x46], offset: 0 },
        ],
    },
};
/**
 * Media Service
 *
 * Handles media file upload, retrieval, and deletion operations.
 * Includes security features:
 * - Magic bytes validation to prevent MIME type spoofing
 * - File size limits per media type
 * - Tenant-scoped operations
 * - S3 cleanup on database failure
 */
let MediaService = class MediaService {
    mediaRepository;
    constructor(mediaRepository) {
        this.mediaRepository = mediaRepository;
    }
    /**
     * Uploads a media file to S3 and creates a database record
     *
     * Security considerations:
     * - Validates file extension
     * - Validates MIME type
     * - Validates file size
     * - Validates magic bytes to prevent MIME spoofing
     * - Cleans up S3 if database operation fails
     *
     * @param file - Uploaded file from multer
     * @param type - Media type (image, video, document)
     * @param tenantId - Tenant UUID
     * @param userId - User UUID who uploaded the file
     * @returns Media record with signed download URL
     */
    async uploadMedia(file, type, tenantId, userId) {
        const config = MEDIA_TYPE_CONFIG[type];
        // Validate file extension
        const extension = this.getFileExtension(file.originalname);
        if (!config.allowedExtensions.includes(extension.toLowerCase())) {
            throw new http_exceptions_1.BadRequestException(`Invalid file extension. Allowed: ${config.allowedExtensions.join(', ')}`);
        }
        // Validate MIME type (but don't fully trust it)
        if (!config.allowedMimeTypes.includes(file.mimetype)) {
            throw new http_exceptions_1.BadRequestException(`Invalid file type. Allowed: ${config.allowedMimeTypes.join(', ')}`);
        }
        // Validate file size
        if (file.size > config.maxSizeBytes) {
            const maxSizeMB = config.maxSizeBytes / (1024 * 1024);
            throw new http_exceptions_1.BadRequestException(`File size exceeds maximum allowed (${maxSizeMB}MB)`);
        }
        // Validate magic bytes - critical security check
        if (!this.validateMagicBytes(file.buffer, config.magicBytes)) {
            logger_config_1.logger.warn('Magic bytes validation failed - possible MIME spoofing attempt', {
                tenantId,
                userId,
                originalName: file.originalname,
                claimedMimeType: file.mimetype,
            });
            throw new http_exceptions_1.BadRequestException('File content does not match the declared file type');
        }
        // Generate S3 key with tenant isolation
        const s3Key = this.generateS3Key(tenantId, type, file.originalname);
        // Upload to S3
        try {
            await (0, s3_config_1.uploadToS3)(s3Key, file.buffer, file.mimetype);
        }
        catch (error) {
            logger_config_1.logger.error('Failed to upload file to S3', {
                error,
                tenantId,
                s3Key,
            });
            throw new http_exceptions_1.BadRequestException('Failed to upload file');
        }
        // Create database record
        let media;
        try {
            media = await this.mediaRepository.create({
                tenantId,
                type,
                originalName: file.originalname,
                mimeType: file.mimetype,
                fileSize: file.size,
                s3Key,
                s3Bucket: s3_config_1.S3_BUCKET,
                uploadedBy: userId,
            });
        }
        catch (error) {
            // Cleanup S3 on database failure
            logger_config_1.logger.error('Failed to create media record, cleaning up S3', {
                error,
                tenantId,
                s3Key,
            });
            await this.safeDeleteFromS3(s3Key);
            throw new http_exceptions_1.BadRequestException('Failed to save media record');
        }
        logger_config_1.auditLogger.info('Media uploaded', {
            action: 'media.upload',
            tenantId,
            userId,
            mediaId: media.id,
            type,
            originalName: file.originalname,
            fileSize: file.size,
        });
        // Generate download URL
        const downloadUrl = await (0, s3_config_1.getDownloadSignedUrl)(s3Key);
        return {
            ...media,
            downloadUrl,
        };
    }
    /**
     * Gets a media record with a signed download URL
     *
     * @param id - Media UUID
     * @param tenantId - Tenant UUID for authorization
     * @returns Media record with download URL
     */
    async getMedia(id, tenantId) {
        const media = await this.mediaRepository.findById(id, tenantId);
        if (!media) {
            throw new http_exceptions_1.NotFoundException('Media not found');
        }
        const downloadUrl = await (0, s3_config_1.getDownloadSignedUrl)(media.s3Key);
        return {
            ...media,
            downloadUrl,
        };
    }
    /**
     * Deletes a media file from S3 and removes the database record
     *
     * @param id - Media UUID
     * @param tenantId - Tenant UUID for authorization
     */
    async deleteMedia(id, tenantId) {
        const media = await this.mediaRepository.findById(id, tenantId);
        if (!media) {
            throw new http_exceptions_1.NotFoundException('Media not found');
        }
        // Delete from S3
        try {
            await (0, s3_config_1.deleteFromS3)(media.s3Key);
        }
        catch (error) {
            logger_config_1.logger.error('Failed to delete file from S3', {
                error,
                tenantId,
                mediaId: id,
                s3Key: media.s3Key,
            });
            // Continue with database deletion even if S3 fails
            // Orphaned S3 objects can be cleaned up with lifecycle rules
        }
        // Delete database record
        await this.mediaRepository.delete(id, tenantId);
        logger_config_1.auditLogger.info('Media deleted', {
            action: 'media.delete',
            tenantId,
            mediaId: id,
            s3Key: media.s3Key,
        });
    }
    /**
     * Gets a presigned URL for direct browser upload to S3
     *
     * This allows clients to upload directly to S3 without going through
     * the application server, which is more efficient for large files.
     *
     * @param type - Media type
     * @param fileName - Original file name
     * @param tenantId - Tenant UUID
     * @returns Presigned upload URL with key and expiry information
     */
    async getPresignedUploadUrl(type, fileName, tenantId) {
        const config = MEDIA_TYPE_CONFIG[type];
        // Validate file extension
        const extension = this.getFileExtension(fileName);
        if (!config.allowedExtensions.includes(extension.toLowerCase())) {
            throw new http_exceptions_1.BadRequestException(`Invalid file extension. Allowed: ${config.allowedExtensions.join(', ')}`);
        }
        // Generate S3 key
        const s3Key = this.generateS3Key(tenantId, type, fileName);
        // Determine content type from extension
        const contentType = this.getContentTypeFromExtension(extension);
        // Generate presigned URL with 15 minute expiry for uploads
        const expiresIn = 900; // 15 minutes
        const uploadUrl = await (0, s3_config_1.getUploadSignedUrl)(s3Key, contentType, expiresIn);
        logger_config_1.auditLogger.info('Presigned upload URL generated', {
            action: 'media.presigned_url',
            tenantId,
            type,
            fileName,
            s3Key,
        });
        return {
            uploadUrl,
            key: s3Key,
            expiresIn,
        };
    }
    /**
     * Generates a unique S3 key for tenant-isolated storage
     *
     * Format: {tenantId}/media/{type}/{uuid}-{originalName}
     *
     * @param tenantId - Tenant UUID
     * @param type - Media type
     * @param originalName - Original file name
     * @returns S3 key
     */
    generateS3Key(tenantId, type, originalName) {
        const uuid = (0, uuid_1.v4)();
        const sanitizedName = this.sanitizeFileName(originalName);
        return `${tenantId}/media/${type}/${uuid}-${sanitizedName}`;
    }
    /**
     * Sanitizes a file name for safe storage
     *
     * Removes potentially dangerous characters and limits length.
     *
     * @param fileName - Original file name
     * @returns Sanitized file name
     */
    sanitizeFileName(fileName) {
        // Remove path traversal attempts
        const baseName = fileName.split(/[/\\]/).pop() || fileName;
        // Remove or replace dangerous characters
        const sanitized = baseName
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .replace(/\.+/g, '.')
            .replace(/_+/g, '_');
        // Limit length (keeping extension intact)
        const extension = this.getFileExtension(sanitized);
        const nameWithoutExt = sanitized.slice(0, -extension.length);
        const maxNameLength = 100;
        if (nameWithoutExt.length > maxNameLength) {
            return nameWithoutExt.slice(0, maxNameLength) + extension;
        }
        return sanitized;
    }
    /**
     * Gets the file extension including the dot
     *
     * @param fileName - File name
     * @returns File extension (e.g., '.jpg')
     */
    getFileExtension(fileName) {
        const lastDot = fileName.lastIndexOf('.');
        if (lastDot === -1 || lastDot === fileName.length - 1) {
            return '';
        }
        return fileName.slice(lastDot).toLowerCase();
    }
    /**
     * Gets the MIME type from a file extension
     *
     * @param extension - File extension (e.g., '.jpg')
     * @returns MIME type
     */
    getContentTypeFromExtension(extension) {
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.mp4': 'video/mp4',
            '.pdf': 'application/pdf',
        };
        return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
    }
    /**
     * Validates file content against expected magic bytes
     *
     * This is a critical security check to prevent MIME type spoofing attacks
     * where an attacker uploads a malicious file with a fake MIME type.
     *
     * @param buffer - File content buffer
     * @param expectedMagicBytes - Array of valid magic byte patterns
     * @returns True if file matches any expected pattern
     */
    validateMagicBytes(buffer, expectedMagicBytes) {
        if (buffer.length < 8) {
            return false;
        }
        return expectedMagicBytes.some(({ bytes, offset }) => {
            if (buffer.length < offset + bytes.length) {
                return false;
            }
            return bytes.every((byte, index) => buffer[offset + index] === byte);
        });
    }
    /**
     * Safely deletes a file from S3, catching any errors
     *
     * Used for cleanup operations where we don't want to throw on failure.
     *
     * @param key - S3 object key
     */
    async safeDeleteFromS3(key) {
        try {
            await (0, s3_config_1.deleteFromS3)(key);
        }
        catch (error) {
            logger_config_1.logger.error('Failed to cleanup S3 file', { error, key });
        }
    }
};
exports.MediaService = MediaService;
exports.MediaService = MediaService = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(media_repository_1.MediaRepository)),
    __metadata("design:paramtypes", [media_repository_1.MediaRepository])
], MediaService);
