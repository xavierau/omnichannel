"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toTagResponse = toTagResponse;
exports.toCustomerResponse = toCustomerResponse;
exports.toPaginatedCustomerResponse = toPaginatedCustomerResponse;
/**
 * Transforms a Tag entity to its API response format.
 *
 * @param tag - The tag entity to transform
 * @returns The tag response object
 */
function toTagResponse(tag) {
    return {
        id: tag.id,
        name: tag.name,
        color: tag.color,
    };
}
/**
 * Transforms a Customer entity to its API response format.
 * This function ensures consistent response structure across all endpoints.
 *
 * @param customer - The customer entity to transform
 * @returns The customer response object
 */
function toCustomerResponse(customer) {
    return {
        id: customer.id,
        name: customer.name,
        whatsappNumber: customer.whatsappNumber,
        tags: (customer.tags || []).map(toTagResponse),
        customFields: customer.customFields || {},
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
    };
}
/**
 * Transforms a paginated customer result to its API response format.
 *
 * @param data - Array of customer entities
 * @param total - Total number of customers matching the query
 * @param page - Current page number
 * @param limit - Items per page
 * @param totalPages - Total number of pages
 * @returns The paginated customer response object
 */
function toPaginatedCustomerResponse(data, total, page, limit, totalPages) {
    return {
        data: data.map(toCustomerResponse),
        meta: {
            total,
            page,
            limit,
            totalPages,
        },
    };
}
