import {
  IsString,
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { TemplateCategory } from '../enums';
import { IsValidCustomFields } from '../../customers/dto/custom-fields.validator';

/**
 * DTO for updating a WhatsApp template group.
 * All fields are optional - only provided fields will be updated.
 */
export class UpdateTemplateGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(255, { message: 'Name must not exceed 255 characters' })
  @Matches(/^[a-z0-9_]+$/, {
    message: 'Name must only contain lowercase letters, numbers, and underscores (WhatsApp requirement)',
  })
  name?: string;

  @IsOptional()
  @IsEnum(TemplateCategory, { message: 'Category must be a valid TemplateCategory' })
  category?: TemplateCategory;

  @IsOptional()
  @IsValidCustomFields({
    message:
      'customFields must be an object with max 10KB size, max 3 levels of nesting, max 50 keys, and only primitive values',
  })
  customFields?: Record<string, unknown>;
}
