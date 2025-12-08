import { MessageContentType } from '../enums';
/**
 * Text content for a text message.
 */
export declare class TextContentDto {
    content: string;
}
/**
 * Media content for image, document, or audio messages.
 */
export declare class MediaContentDto {
    url: string;
    mimeType?: string;
    caption?: string;
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
export declare class TemplateContentDto {
    name: string;
    language: string;
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
export declare class SendMessageDto {
    contentType: MessageContentType;
    text?: TextContentDto;
    media?: MediaContentDto;
    template?: TemplateContentDto;
}
