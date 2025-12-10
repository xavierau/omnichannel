import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsArray,
  IsEnum,
  IsDateString,
  MinLength,
  MaxLength,
  ArrayNotEmpty,
} from 'class-validator';
import { ApiKeyPermission } from '../enums/api-key-permission.enum';

/**
 * DTO for creating a new API key.
 *
 * Security considerations:
 * - Name is limited to 100 characters to match database schema
 * - Channel account ID must be a valid UUID if provided
 * - Permissions must be valid enum values from ApiKeyPermission
 * - At least one permission is required
 * - Expiration date is optional but must be a valid ISO date string if provided
 */
export class CreateApiKeyDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(1, { message: 'Name must not be empty' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name: string;

  @IsOptional()
  @IsUUID('4', { message: 'Channel account ID must be a valid UUID' })
  channelAccountId?: string | null;

  @IsArray({ message: 'Permissions must be an array' })
  @ArrayNotEmpty({ message: 'At least one permission is required' })
  @IsEnum(ApiKeyPermission, {
    each: true,
    message: `Each permission must be one of: ${Object.values(ApiKeyPermission).join(', ')}`,
  })
  permissions: ApiKeyPermission[];

  @IsOptional()
  @IsDateString({}, { message: 'Expiration date must be a valid ISO 8601 date string' })
  expiresAt?: string | null;
}
