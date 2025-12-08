"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toTemplateButtonResponse = toTemplateButtonResponse;
exports.toTemplateTranslationResponse = toTemplateTranslationResponse;
exports.toTemplateGroupResponse = toTemplateGroupResponse;
exports.toPaginatedTemplateResponse = toPaginatedTemplateResponse;
/**
 * Transforms a TemplateButton to its API response format.
 *
 * @param button - The button object to transform
 * @returns The button response object
 */
function toTemplateButtonResponse(button) {
    return {
        id: button.id,
        type: button.type,
        text: button.text,
        url: button.url,
        phoneNumber: button.phoneNumber,
    };
}
/**
 * Transforms a TemplateTranslation entity to its API response format.
 *
 * @param translation - The translation entity to transform
 * @returns The translation response object
 */
function toTemplateTranslationResponse(translation) {
    return {
        id: translation.id,
        language: translation.language,
        status: translation.status,
        quality: translation.quality,
        headerType: translation.headerType,
        headerContent: translation.headerContent,
        body: translation.body,
        footer: translation.footer,
        buttons: (translation.buttons || []).map(toTemplateButtonResponse),
        rejectionReason: translation.rejectionReason,
        createdAt: translation.createdAt,
        updatedAt: translation.updatedAt,
    };
}
/**
 * Transforms a WhatsAppTemplateGroup entity to its API response format.
 * This function ensures consistent response structure across all endpoints.
 *
 * @param group - The template group entity to transform
 * @returns The template group response object
 */
function toTemplateGroupResponse(group) {
    return {
        id: group.id,
        name: group.name,
        category: group.category,
        customFields: group.customFields || {},
        translations: (group.translations || []).map(toTemplateTranslationResponse),
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
    };
}
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
function toPaginatedTemplateResponse(data, total, page, limit, totalPages) {
    return {
        data: data.map(toTemplateGroupResponse),
        meta: {
            total,
            page,
            limit,
            totalPages,
        },
    };
}
