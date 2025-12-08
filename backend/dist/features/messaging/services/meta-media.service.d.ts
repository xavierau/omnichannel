import { ProviderFactory } from '../provider-factory';
/**
 * Result of processing inbound media.
 */
export interface ProcessedMedia {
    /** S3 object key where the media is stored */
    s3Key: string;
    /** Signed URL for accessing the media (valid for 7 days) */
    url: string;
    /** Content type of the media */
    contentType: string;
    /** Size of the media in bytes */
    size: number;
}
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
export declare class MetaMediaService {
    private providerFactory;
    constructor(providerFactory: ProviderFactory);
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
    processInboundMedia(mediaId: string, mimeType: string, channelAccountId: string, tenantId: string, conversationId: string): Promise<ProcessedMedia>;
    /**
     * Get file extension from MIME type.
     *
     * @param mimeType - The MIME type (e.g., 'image/jpeg')
     * @returns The file extension including dot (e.g., '.jpg') or empty string if unknown
     */
    private getExtensionFromMimeType;
    /**
     * Refresh the signed URL for an existing S3 media file.
     *
     * Use this when a previously generated URL has expired or is about to expire.
     *
     * @param s3Key - The S3 object key
     * @param expiresIn - Expiry time in seconds (default: 7 days)
     * @returns A new signed URL
     */
    refreshMediaUrl(s3Key: string, expiresIn?: number): Promise<string>;
}
