import { WhatsAppTemplateGroup } from './template-group.entity';
import { TemplateTranslation, TemplateButton } from './template-translation.entity';
import { TemplateCategory, TemplateStatus, TemplateQuality, HeaderType, ButtonType } from './enums';
/**
 * Response structure for a template button.
 */
export interface TemplateButtonResponse {
    id: string;
    type: ButtonType;
    text: string;
    url?: string;
    phoneNumber?: string;
}
/**
 * Response structure for a template translation.
 */
export interface TemplateTranslationResponse {
    id: string;
    language: string;
    status: TemplateStatus;
    quality: TemplateQuality | null;
    headerType: HeaderType | null;
    headerContent: string | null;
    body: string;
    footer: string | null;
    buttons: TemplateButtonResponse[];
    rejectionReason: string | null;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Response structure for a template group.
 */
export interface TemplateGroupResponse {
    id: string;
    name: string;
    category: TemplateCategory;
    customFields: Record<string, unknown>;
    translations: TemplateTranslationResponse[];
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Response structure for paginated template list.
 */
export interface PaginatedTemplateResponse {
    data: TemplateGroupResponse[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
/**
 * Transforms a TemplateButton to its API response format.
 *
 * @param button - The button object to transform
 * @returns The button response object
 */
export declare function toTemplateButtonResponse(button: TemplateButton): TemplateButtonResponse;
/**
 * Transforms a TemplateTranslation entity to its API response format.
 *
 * @param translation - The translation entity to transform
 * @returns The translation response object
 */
export declare function toTemplateTranslationResponse(translation: TemplateTranslation): TemplateTranslationResponse;
/**
 * Transforms a WhatsAppTemplateGroup entity to its API response format.
 * This function ensures consistent response structure across all endpoints.
 *
 * @param group - The template group entity to transform
 * @returns The template group response object
 */
export declare function toTemplateGroupResponse(group: WhatsAppTemplateGroup): TemplateGroupResponse;
/**
 * Transforms a paginated template result to its API response format.
 *
 * @param data - Array of template group entities
 * @param total - Total number of templates matching the query
 * @param page - Current page number
 * @param limit - Items per page
 * @param totalPages - Total number of pages
 * @returns The paginated template response object
 */
export declare function toPaginatedTemplateResponse(data: WhatsAppTemplateGroup[], total: number, page: number, limit: number, totalPages: number): PaginatedTemplateResponse;
