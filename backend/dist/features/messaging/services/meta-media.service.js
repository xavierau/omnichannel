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
exports.MetaMediaService = void 0;
const tsyringe_1 = require("tsyringe");
const uuid_1 = require("uuid");
const provider_factory_1 = require("../provider-factory");
const s3_config_1 = require("../../../config/s3.config");
const logger_config_1 = require("../../../config/logger.config");
/**
 * MIME type to file extension mapping for common WhatsApp media types.
 *
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media#supported-media-types
 */
const MIME_TO_EXTENSION = {
    // Images
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    // Videos
    'video/mp4': '.mp4',
    'video/3gpp': '.3gp',
    // Audio
    'audio/aac': '.aac',
    'audio/mp4': '.m4a',
    'audio/mpeg': '.mp3',
    'audio/amr': '.amr',
    'audio/ogg': '.ogg',
    // Documents
    'application/pdf': '.pdf',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'text/plain': '.txt',
    // Stickers (WebP format)
    // Note: image/webp is already mapped above
};
/**
 * Default signed URL expiry time in seconds (7 days).
 */
const DEFAULT_SIGNED_URL_EXPIRY_SECONDS = 7 * 24 * 60 * 60;
/**
 * MetaMediaService handles downloading media from Meta's CDN and uploading to S3.
 *
 * When WhatsApp users send media messages (images, videos, audio, documents, stickers),
 * Meta provides temporary CDN URLs that expire after approximately 24 hours.
 * This service downloads the media and stores it permanently in S3.
 *
 * Flow:
 * 1. Webhook receives message with media ID
 * 2. Use provider to get temporary CDN URL from Meta
 * 3. Download the media content from CDN
 * 4. Upload to S3 with tenant-isolated path
 * 5. Return permanent S3 URL
 *
 * @remarks
 * - Media is organized by tenant, conversation, and timestamp for easy management
 * - S3 keys follow pattern: {tenantId}/media/{conversationId}/{timestamp}-{uuid}{extension}
 * - Signed URLs are valid for 7 days by default
 * - Errors are logged but don't fail the entire webhook processing
 */
let MetaMediaService = class MetaMediaService {
    providerFactory;
    constructor(providerFactory) {
        this.providerFactory = providerFactory;
    }
    /**
     * Process inbound media: download from Meta CDN and upload to S3.
     *
     * This method handles the complete flow of:
     * 1. Getting the download URL from Meta using the media ID
     * 2. Downloading the actual media content
     * 3. Uploading to S3 with proper organization
     * 4. Generating a signed URL for access
     *
     * @param mediaId - The media ID from the webhook payload (e.g., image.id)
     * @param mimeType - The MIME type from the webhook payload (e.g., image.mime_type)
     * @param channelAccountId - The channel account that received the message
     * @param tenantId - The tenant ID for multi-tenancy isolation
     * @param conversationId - The conversation ID for organizing media
     * @returns The S3 key and signed URL for the uploaded media
     * @throws Error if media download or upload fails
     */
    async processInboundMedia(mediaId, mimeType, channelAccountId, tenantId, conversationId) {
        logger_config_1.logger.debug('Processing inbound media', {
            mediaId,
            mimeType,
            channelAccountId,
            tenantId,
            conversationId,
        });
        // 1. Get provider for channel account
        const provider = await this.providerFactory.createProviderForChannelAccount(channelAccountId);
        // 2. Verify provider supports media operations
        if (!provider.getMediaUrl || !provider.downloadMedia) {
            throw new Error('Provider does not support media operations');
        }
        // 3. Get download URL from Meta
        const mediaUrl = await provider.getMediaUrl(mediaId);
        // 4. Download the media
        const { data, contentType } = await provider.downloadMedia(mediaUrl);
        // 5. Generate S3 key with proper organization
        const extension = this.getExtensionFromMimeType(contentType || mimeType);
        const timestamp = Date.now();
        const uniqueId = (0, uuid_1.v4)();
        const s3Key = `${tenantId}/media/${conversationId}/${timestamp}-${uniqueId}${extension}`;
        // 6. Upload to S3
        await (0, s3_config_1.uploadToS3)(s3Key, data, contentType || mimeType);
        logger_config_1.logger.info('Inbound media processed and uploaded to S3', {
            mediaId,
            s3Key,
            contentType: contentType || mimeType,
            size: data.length,
            tenantId,
            conversationId,
        });
        // 7. Get signed download URL
        const url = await (0, s3_config_1.getDownloadSignedUrl)(s3Key, DEFAULT_SIGNED_URL_EXPIRY_SECONDS);
        return {
            s3Key,
            url,
            contentType: contentType || mimeType,
            size: data.length,
        };
    }
    /**
     * Get file extension from MIME type.
     *
     * @param mimeType - The MIME type (e.g., 'image/jpeg')
     * @returns The file extension including dot (e.g., '.jpg') or empty string if unknown
     */
    getExtensionFromMimeType(mimeType) {
        // Normalize MIME type (remove parameters like charset)
        const normalizedMimeType = mimeType.split(';')[0].trim().toLowerCase();
        return MIME_TO_EXTENSION[normalizedMimeType] || '';
    }
    /**
     * Refresh the signed URL for an existing S3 media file.
     *
     * Use this when a previously generated URL has expired or is about to expire.
     *
     * @param s3Key - The S3 object key
     * @param expiresIn - Expiry time in seconds (default: 7 days)
     * @returns A new signed URL
     */
    async refreshMediaUrl(s3Key, expiresIn = DEFAULT_SIGNED_URL_EXPIRY_SECONDS) {
        return (0, s3_config_1.getDownloadSignedUrl)(s3Key, expiresIn);
    }
};
exports.MetaMediaService = MetaMediaService;
exports.MetaMediaService = MetaMediaService = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(provider_factory_1.ProviderFactory)),
    __metadata("design:paramtypes", [provider_factory_1.ProviderFactory])
], MetaMediaService);
