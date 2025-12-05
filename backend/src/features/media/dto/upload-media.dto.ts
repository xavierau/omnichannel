import { IsEnum } from 'class-validator';
import { MediaType } from '../media.entity';

/**
 * DTO for media upload requests
 *
 * Used for validating the media type when uploading files.
 * The file itself is handled by multer middleware.
 */
export class UploadMediaDto {
  @IsEnum(MediaType, {
    message: `type must be one of: ${Object.values(MediaType).join(', ')}`,
  })
  type: MediaType;
}
