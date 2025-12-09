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
exports.MediaController = void 0;
const tsyringe_1 = require("tsyringe");
const media_service_1 = require("./media.service");
const async_handler_1 = require("../../middleware/async-handler");
const http_exceptions_1 = require("../../shared/exceptions/http-exceptions");
const media_entity_1 = require("./media.entity");
/**
 * Media Controller
 *
 * Handles HTTP endpoints for media operations:
 * - POST /upload - Upload file via multipart/form-data
 * - GET /:id - Get media with signed download URL
 * - DELETE /:id - Delete media
 * - POST /presigned-url - Get presigned URL for direct S3 upload
 */
let MediaController = class MediaController {
    mediaService;
    constructor(mediaService) {
        this.mediaService = mediaService;
    }
    /**
     * Upload a media file
     *
     * Accepts multipart/form-data with:
     * - file: The file to upload
     * - type: Media type (image, video, document)
     *
     * Returns the created media record with a signed download URL.
     */
    uploadMedia = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const userId = req.user?.id;
        if (!userId) {
            throw new http_exceptions_1.BadRequestException('User ID is required');
        }
        if (!req.file) {
            throw new http_exceptions_1.BadRequestException('No file uploaded');
        }
        const type = req.body.type;
        if (!type || !Object.values(media_entity_1.MediaType).includes(type)) {
            throw new http_exceptions_1.BadRequestException(`Invalid media type. Must be one of: ${Object.values(media_entity_1.MediaType).join(', ')}`);
        }
        // Convert multer file to our interface
        const uploadedFile = {
            fieldname: req.file.fieldname,
            originalname: req.file.originalname,
            encoding: req.file.encoding,
            mimetype: req.file.mimetype,
            buffer: req.file.buffer,
            size: req.file.size,
        };
        const media = await this.mediaService.uploadMedia(uploadedFile, type, tenantId, userId);
        res.status(201).json({
            data: this.toMediaResponse(media),
        });
    });
    /**
     * Get a media record with signed download URL
     *
     * Returns the media metadata along with a time-limited download URL.
     */
    getMedia = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const tenantId = req.tenantId;
        const media = await this.mediaService.getMedia(id, tenantId);
        res.json({
            data: this.toMediaResponse(media),
        });
    });
    /**
     * Delete a media file
     *
     * Removes the file from S3 and deletes the database record.
     */
    deleteMedia = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const tenantId = req.tenantId;
        await this.mediaService.deleteMedia(id, tenantId);
        res.status(204).send();
    });
    /**
     * Get a presigned URL for direct browser upload to S3
     *
     * Allows clients to upload directly to S3, which is more efficient
     * for large files as they don't need to go through the application server.
     *
     * Returns:
     * - uploadUrl: Presigned URL for PUT request
     * - key: S3 object key
     * - expiresIn: URL expiry in seconds
     */
    getPresignedUrl = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const { type, fileName } = req.body;
        if (!type || !Object.values(media_entity_1.MediaType).includes(type)) {
            throw new http_exceptions_1.BadRequestException(`Invalid media type. Must be one of: ${Object.values(media_entity_1.MediaType).join(', ')}`);
        }
        if (!fileName || typeof fileName !== 'string') {
            throw new http_exceptions_1.BadRequestException('fileName is required');
        }
        const result = await this.mediaService.getPresignedUploadUrl(type, fileName, tenantId);
        res.json({
            data: result,
        });
    });
    /**
     * Transforms media entity to API response format
     */
    toMediaResponse(media) {
        return {
            id: media.id,
            type: media.type,
            originalName: media.originalName,
            mimeType: media.mimeType,
            fileSize: media.fileSize,
            uploadedBy: media.uploadedBy,
            createdAt: media.createdAt,
            downloadUrl: media.downloadUrl,
        };
    }
};
exports.MediaController = MediaController;
exports.MediaController = MediaController = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(media_service_1.MediaService)),
    __metadata("design:paramtypes", [media_service_1.MediaService])
], MediaController);
