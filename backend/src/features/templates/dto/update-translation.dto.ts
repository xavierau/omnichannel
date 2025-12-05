import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  MaxLength,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { HeaderType, TemplateStatus, TemplateQuality } from '../enums';
import { TemplateButtonDto } from './template-button.dto';

/**
 * DTO for updating a template translation.
 * All fields are optional - only provided fields will be updated.
 * Status and quality fields are typically updated by admin/system for approval workflows.
 */
export class UpdateTranslationDto {
  @IsOptional()
  @IsEnum(HeaderType, { message: 'Header type must be a valid HeaderType' })
  headerType?: HeaderType;

  @IsOptional()
  @IsString()
  @MaxLength(1024, { message: 'Header content must not exceed 1024 characters' })
  headerContent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024, { message: 'Body must not exceed 1024 characters' })
  body?: string;

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

  @IsOptional()
  @IsEnum(TemplateStatus, { message: 'Status must be a valid TemplateStatus' })
  status?: TemplateStatus;

  @IsOptional()
  @IsEnum(TemplateQuality, { message: 'Quality must be a valid TemplateQuality' })
  quality?: TemplateQuality;

  @IsOptional()
  @IsString()
  @MaxLength(1024, { message: 'Rejection reason must not exceed 1024 characters' })
  rejectionReason?: string;
}
