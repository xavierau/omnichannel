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
import { MessageContentType } from '@features/inbox/enums';

/**
 * Text content for a text message.
 */
export class AgentTextContentDto {
  @IsString()
  @MaxLength(4096, { message: 'Text content must not exceed 4096 characters' })
  content: string;
}

/**
 * Media content for image, document, or audio messages.
 */
export class AgentMediaContentDto {
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
 * Template variables structure for Agent API.
 * Variables are organized by component type (header, body, button).
 */
export interface AgentTemplateVariables {
  header?: Record<string, string>;
  body?: Record<string, string>;
  button?: Record<string, string>;
}

/**
 * Template content for template messages.
 */
export class AgentTemplateContentDto {
  @IsString()
  @MaxLength(512, { message: 'Template name must not exceed 512 characters' })
  name: string;

  @IsString()
  @MaxLength(10, { message: 'Language code must not exceed 10 characters' })
  language: string;

  @IsOptional()
  @IsObject()
  variables?: AgentTemplateVariables;
}

/**
 * DTO for sending a message in a conversation via Agent API.
 *
 * Supports content types:
 * - TEXT: Requires text.content
 * - IMAGE, DOCUMENT, AUDIO: Requires media.url
 * - TEMPLATE: Requires template.name and template.language
 *
 * AI agents typically use templates for outbound messages outside the
 * 24-hour messaging window, and freeform messages when responding to
 * customer messages within the window.
 */
export class AgentSendMessageDto {
  @IsEnum(MessageContentType, {
    message: 'contentType must be one of: text, image, document, audio, template',
  })
  contentType: MessageContentType;

  @ValidateIf((o) => o.contentType === MessageContentType.TEXT)
  @ValidateNested()
  @Type(() => AgentTextContentDto)
  text?: AgentTextContentDto;

  @ValidateIf(
    (o) =>
      o.contentType === MessageContentType.IMAGE ||
      o.contentType === MessageContentType.DOCUMENT ||
      o.contentType === MessageContentType.AUDIO
  )
  @ValidateNested()
  @Type(() => AgentMediaContentDto)
  media?: AgentMediaContentDto;

  @ValidateIf((o) => o.contentType === MessageContentType.TEMPLATE)
  @ValidateNested()
  @Type(() => AgentTemplateContentDto)
  template?: AgentTemplateContentDto;
}
