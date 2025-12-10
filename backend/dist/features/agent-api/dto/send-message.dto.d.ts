import { MessageContentType } from '../../inbox/enums';
/**
 * Text content for a text message.
 */
export declare class AgentTextContentDto {
    content: string;
}
/**
 * Media content for image, document, or audio messages.
 */
export declare class AgentMediaContentDto {
    url: string;
    mimeType?: string;
    caption?: string;
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
export declare class AgentTemplateContentDto {
    name: string;
    language: string;
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
export declare class AgentSendMessageDto {
    contentType: MessageContentType;
    text?: AgentTextContentDto;
    media?: AgentMediaContentDto;
    template?: AgentTemplateContentDto;
}
