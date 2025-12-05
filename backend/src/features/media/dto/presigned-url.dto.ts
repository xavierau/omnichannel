import { IsEnum, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { MediaType } from '../media.entity';

/**
 * DTO for presigned URL requests
 *
 * Used when requesting a presigned URL for direct browser upload to S3.
 */
export class PresignedUrlDto {
  @IsEnum(MediaType, {
    message: `type must be one of: ${Object.values(MediaType).join(', ')}`,
  })
  type: MediaType;

  @IsString()
  @MinLength(1, { message: 'fileName must not be empty' })
  @MaxLength(255, { message: 'fileName must not exceed 255 characters' })
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'fileName must contain only alphanumeric characters, dots, hyphens, and underscores',
  })
  fileName: string;
}
