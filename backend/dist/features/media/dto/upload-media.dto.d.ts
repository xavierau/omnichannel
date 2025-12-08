import { MediaType } from '../media.entity';
/**
 * DTO for media upload requests
 *
 * Used for validating the media type when uploading files.
 * The file itself is handled by multer middleware.
 */
export declare class UploadMediaDto {
    type: MediaType;
}
