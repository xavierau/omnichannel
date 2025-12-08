import { MediaType } from '../media.entity';
/**
 * DTO for presigned URL requests
 *
 * Used when requesting a presigned URL for direct browser upload to S3.
 */
export declare class PresignedUrlDto {
    type: MediaType;
    fileName: string;
}
