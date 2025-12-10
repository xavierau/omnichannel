import { MediaType } from '../media.entity';
/**
 * DTO for presigned URL requests
 *
 * Used when requesting a presigned URL for direct browser upload to S3.
 *
 * Accepts either:
 * - contentType (MIME type) + filename (frontend format)
 * - type (MediaType enum) + fileName (legacy format)
 */
export declare class PresignedUrlDto {
    filename: string;
    contentType: string;
    conversationId?: string;
    /**
     * Get the MediaType from contentType
     */
    getMediaType(): MediaType;
}
