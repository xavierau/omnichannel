import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { MediaType } from '../media.entity';

/**
 * Map MIME types to MediaType enum
 */
const MIME_TYPE_TO_MEDIA_TYPE: Record<string, MediaType> = {
  // Images
  'image/jpeg': MediaType.IMAGE,
  'image/jpg': MediaType.IMAGE,
  'image/png': MediaType.IMAGE,
  'image/gif': MediaType.IMAGE,
  'image/webp': MediaType.IMAGE,

  // Videos
  'video/mp4': MediaType.VIDEO,
  'video/3gpp': MediaType.VIDEO,
  'video/quicktime': MediaType.VIDEO,

  // Documents
  'application/pdf': MediaType.DOCUMENT,
  'application/msword': MediaType.DOCUMENT,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': MediaType.DOCUMENT,
  'application/vnd.ms-excel': MediaType.DOCUMENT,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': MediaType.DOCUMENT,
  'application/vnd.ms-powerpoint': MediaType.DOCUMENT,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': MediaType.DOCUMENT,
  'text/plain': MediaType.DOCUMENT,
  'text/csv': MediaType.DOCUMENT,
  'application/zip': MediaType.DOCUMENT,

  // Audio
  'audio/webm': MediaType.DOCUMENT,
  'audio/ogg': MediaType.DOCUMENT,
  'audio/mpeg': MediaType.DOCUMENT,
  'audio/mp4': MediaType.DOCUMENT,
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
export class PresignedUrlDto {
  @IsString()
  @MinLength(1, { message: 'filename must not be empty' })
  @MaxLength(255, { message: 'filename must not exceed 255 characters' })
  filename: string;

  @IsString()
  @MinLength(1, { message: 'contentType must not be empty' })
  contentType: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  /**
   * Get the MediaType from contentType
   */
  getMediaType(): MediaType {
    const mediaType = MIME_TYPE_TO_MEDIA_TYPE[this.contentType.toLowerCase()];
    if (!mediaType) {
      throw new Error(`Unsupported content type: ${this.contentType}`);
    }
    return mediaType;
  }
}
