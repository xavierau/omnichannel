import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  MinLength,
  MaxLength,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { HeaderType } from '../enums';
import { TemplateButtonDto } from './template-button.dto';

/**
 * DTO for creating a template translation.
 * Each translation represents the template content in a specific language.
 */
export class CreateTranslationDto {
  @IsString()
  @MinLength(2, { message: 'Language code must be at least 2 characters' })
  @MaxLength(10, { message: 'Language code must not exceed 10 characters' })
  language: string;

  @IsOptional()
  @IsEnum(HeaderType, { message: 'Header type must be a valid HeaderType' })
  headerType?: HeaderType;

  @IsOptional()
  @IsString()
  @MaxLength(1024, { message: 'Header content must not exceed 1024 characters' })
  headerContent?: string;

  @IsString()
  @MinLength(1, { message: 'Body is required' })
  @MaxLength(1024, { message: 'Body must not exceed 1024 characters' })
  body: string;

  @IsOptional()
  @IsString()
  @MaxLength(60, { message: 'Footer must not exceed 60 characters' })
  footer?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3, { message: 'Maximum of 3 buttons allowed' })
  @ValidateNested({ each: true })
  @Type(() => TemplateButtonDto)
  buttons?: TemplateButtonDto[];
}
