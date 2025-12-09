import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  IsUUID,
} from 'class-validator';

/**
 * DTO for creating a channel account with class-validator decorators.
 *
 * This class validates the request body for channel account creation.
 * Credentials are provider-specific based on the provider's config_schema.
 */
export class CreateChannelAccountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsString()
  @IsNotEmpty()
  channelCode: string; // e.g., 'whatsapp'

  @IsOptional()
  @IsString()
  providerCode?: string; // e.g., 'meta_cloud_api' - defaults to primary provider for channel

  @IsObject()
  @IsNotEmpty()
  credentials: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  teamIds?: string[];
}
