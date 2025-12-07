import { singleton, inject } from 'tsyringe';
import { v4 as uuidv4 } from 'uuid';
import { ProviderFactory } from '../provider-factory';
import { uploadToS3, getDownloadSignedUrl } from '../../../config/s3.config';
import { logger } from '../../../config/logger.config';

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
 * MIME type to file extension mapping for common WhatsApp media types.
 *
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media#supported-media-types
 */
const MIME_TO_EXTENSION: Record<string, string> = {
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
@singleton()
export class MetaMediaService {
  constructor(
    @inject(ProviderFactory) private providerFactory: ProviderFactory
  ) {}

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
  async processInboundMedia(
    mediaId: string,
    mimeType: string,
    channelAccountId: string,
    tenantId: string,
    conversationId: string
  ): Promise<ProcessedMedia> {
    logger.debug('Processing inbound media', {
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
    const uniqueId = uuidv4();
    const s3Key = `${tenantId}/media/${conversationId}/${timestamp}-${uniqueId}${extension}`;

    // 6. Upload to S3
    await uploadToS3(s3Key, data, contentType || mimeType);

    logger.info('Inbound media processed and uploaded to S3', {
      mediaId,
      s3Key,
      contentType: contentType || mimeType,
      size: data.length,
      tenantId,
      conversationId,
    });

    // 7. Get signed download URL
    const url = await getDownloadSignedUrl(s3Key, DEFAULT_SIGNED_URL_EXPIRY_SECONDS);

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
  private getExtensionFromMimeType(mimeType: string): string {
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
  async refreshMediaUrl(
    s3Key: string,
    expiresIn: number = DEFAULT_SIGNED_URL_EXPIRY_SECONDS
  ): Promise<string> {
    return getDownloadSignedUrl(s3Key, expiresIn);
  }
}
