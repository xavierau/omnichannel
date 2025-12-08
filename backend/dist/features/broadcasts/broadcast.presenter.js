"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toBroadcastResponse = toBroadcastResponse;
exports.toBroadcastListResponse = toBroadcastListResponse;
exports.toPaginatedBroadcastResponse = toPaginatedBroadcastResponse;
/**
 * Transforms a VariableConfig to its response format.
 */
function toVariableConfigResponse(config) {
    return {
        index: config.index,
        sourceType: config.sourceType,
        ...(config.staticValue !== undefined && { staticValue: config.staticValue }),
        ...(config.customerField !== undefined && { customerField: config.customerField }),
    };
}
/**
 * Transforms a HeaderConfig to its response format.
 */
function toHeaderConfigResponse(config) {
    return {
        type: config.type,
        ...(config.textVariable && { textVariable: toVariableConfigResponse(config.textVariable) }),
        ...(config.mediaUrl !== undefined && { mediaUrl: config.mediaUrl }),
    };
}
/**
 * Transforms a ButtonVariableConfig to its response format.
 */
function toButtonVariableConfigResponse(config) {
    return {
        buttonIndex: config.buttonIndex,
        variable: toVariableConfigResponse(config.variable),
    };
}
/**
 * Transforms a TemplateVariablesConfig to its response format.
 */
function toTemplateVariablesConfigResponse(config) {
    return {
        ...(config.header && { header: toHeaderConfigResponse(config.header) }),
        bodyVariables: config.bodyVariables.map(toVariableConfigResponse),
        buttonVariables: config.buttonVariables.map(toButtonVariableConfigResponse),
    };
}
/**
 * Transforms a Broadcast entity to its full API response format.
 * Used for single broadcast responses (get by ID, create, update).
 *
 * @param broadcast - The broadcast entity to transform
 * @returns The full broadcast response object
 */
function toBroadcastResponse(broadcast) {
    return {
        id: broadcast.id,
        name: broadcast.name,
        description: broadcast.description,
        templateId: broadcast.templateId,
        templateName: broadcast.templateName,
        templateCategory: broadcast.templateCategory,
        templateLanguage: broadcast.templateLanguage,
        recipientType: broadcast.recipientType,
        groupId: broadcast.groupId,
        customerIds: broadcast.customerIds,
        totalRecipients: broadcast.totalRecipients,
        templateVariables: toTemplateVariablesConfigResponse(broadcast.templateVariables),
        isImmediate: broadcast.isImmediate,
        scheduledAt: broadcast.scheduledAt,
        timezone: broadcast.timezone,
        status: broadcast.status,
        sentCount: broadcast.sentCount,
        deliveredCount: broadcast.deliveredCount,
        readCount: broadcast.readCount,
        failedCount: broadcast.failedCount,
        createdBy: broadcast.createdBy,
        createdAt: broadcast.createdAt,
        updatedAt: broadcast.updatedAt,
        completedAt: broadcast.completedAt,
        customFields: broadcast.customFields || {},
    };
}
/**
 * Transforms a Broadcast entity to its lightweight list response format.
 * Used for list endpoints to reduce payload size.
 *
 * @param broadcast - The broadcast entity to transform
 * @returns The lightweight broadcast response object
 */
function toBroadcastListResponse(broadcast) {
    return {
        id: broadcast.id,
        name: broadcast.name,
        description: broadcast.description,
        templateName: broadcast.templateName,
        templateCategory: broadcast.templateCategory,
        recipientType: broadcast.recipientType,
        totalRecipients: broadcast.totalRecipients,
        isImmediate: broadcast.isImmediate,
        scheduledAt: broadcast.scheduledAt,
        status: broadcast.status,
        sentCount: broadcast.sentCount,
        deliveredCount: broadcast.deliveredCount,
        readCount: broadcast.readCount,
        failedCount: broadcast.failedCount,
        createdAt: broadcast.createdAt,
        updatedAt: broadcast.updatedAt,
    };
}
/**
 * Transforms a paginated broadcast result to its API response format.
 *
 * @param data - Array of broadcast entities
 * @param total - Total number of broadcasts matching the query
 * @param page - Current page number
 * @param limit - Items per page
 * @param totalPages - Total number of pages
 * @returns The paginated broadcast response object
 */
function toPaginatedBroadcastResponse(data, total, page, limit, totalPages) {
    return {
        data: data.map(toBroadcastListResponse),
        meta: {
            total,
            page,
            limit,
            totalPages,
        },
    };
}
