import {
  IsString,
  IsOptional,
  IsEnum,
  ValidateNested,
  IsUrl,
  MaxLength,
  IsObject,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageContentType } from '../enums';

/**
 * Text content for a text message.
 */
export class TextContentDto {
  @IsString()
  @MaxLength(4096, { message: 'Text content must not exceed 4096 characters' })
  content: string;
}

/**
 * Media content for image, document, or audio messages.
 */
export class MediaContentDto {
  @IsUrl({}, { message: 'Media URL must be a valid URL' })
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'MIME type must not exceed 255 characters' })
  mimeType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024, { message: 'Caption must not exceed 1024 characters' })
  caption?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Filename must not exceed 255 characters' })
  filename?: string;
}

/**
 * Template variables structure.
 * Variables are organized by component type (header, body, button).
 */
export interface TemplateVariables {
  header?: Record<string, string>;
  body?: Record<string, string>;
  button?: Record<string, string>;
}

/**
 * Template content for template messages.
 */
export class TemplateContentDto {
  @IsString()
  @MaxLength(512, { message: 'Template name must not exceed 512 characters' })
  name: string;

  @IsString()
  @MaxLength(10, { message: 'Language code must not exceed 10 characters' })
  language: string;

  @IsOptional()
  @IsObject()
  variables?: TemplateVariables;
}

/**
 * DTO for sending a message in a conversation.
 * Supports text, image, document, audio, and template content types.
 *
 * Validation ensures:
 * - text is required when contentType is TEXT
 * - media is required when contentType is IMAGE, DOCUMENT, or AUDIO
 * - template is required when contentType is TEMPLATE
 */
export class SendMessageDto {
  @IsEnum(MessageContentType, {
    message: 'contentType must be one of: text, image, document, audio, template',
  })
  contentType: MessageContentType;

  @ValidateIf((o) => o.contentType === MessageContentType.TEXT)
  @ValidateNested()
  @Type(() => TextContentDto)
  text?: TextContentDto;

  @ValidateIf(
    (o) =>
      o.contentType === MessageContentType.IMAGE ||
      o.contentType === MessageContentType.DOCUMENT ||
      o.contentType === MessageContentType.AUDIO
  )
  @ValidateNested()
  @Type(() => MediaContentDto)
  media?: MediaContentDto;

  @ValidateIf((o) => o.contentType === MessageContentType.TEMPLATE)
  @ValidateNested()
  @Type(() => TemplateContentDto)
  template?: TemplateContentDto;
}
