import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { TemplateCategory } from '../enums';
import { IsValidCustomFields } from '../../customers/dto/custom-fields.validator';

/**
 * DTO for creating a new WhatsApp template group.
 * A template group contains translations of the same template in different languages.
 */
export class CreateTemplateGroupDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(255, { message: 'Name must not exceed 255 characters' })
  @Matches(/^[a-z0-9_]+$/, {
    message: 'Name must only contain lowercase letters, numbers, and underscores (WhatsApp requirement)',
  })
  name: string;

  @IsEnum(TemplateCategory, { message: 'Category must be a valid TemplateCategory' })
  category: TemplateCategory;

  /**
   * Channel account this template belongs to.
   * Templates are approved per WABA (WhatsApp Business Account).
   */
  @IsOptional()
  @IsUUID('4', { message: 'channelAccountId must be a valid UUID' })
  channelAccountId?: string;

  @IsOptional()
  @IsValidCustomFields({
    message:
      'customFields must be an object with max 10KB size, max 3 levels of nesting, max 50 keys, and only primitive values',
  })
  customFields?: Record<string, unknown>;
}
