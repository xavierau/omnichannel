"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toGroupResponse = toGroupResponse;
exports.toGroupMemberResponse = toGroupMemberResponse;
exports.toPaginatedGroupResponse = toPaginatedGroupResponse;
exports.toPaginatedMemberResponse = toPaginatedMemberResponse;
/**
 * Transforms a Tag entity to its API response format.
 */
function toTagResponse(tag) {
    return {
        id: tag.id,
        name: tag.name,
        color: tag.color,
    };
}
/**
 * Transforms group criteria to its API response format.
 */
function toCriteriaResponse(criteria) {
    if (!criteria)
        return null;
    return {
        tagIds: criteria.tagIds,
        createdAfter: criteria.createdAfter,
        createdBefore: criteria.createdBefore,
        customFieldConditions: criteria.customFieldConditions?.map((condition) => ({
            fieldKey: condition.fieldKey,
            operator: condition.operator,
            value: condition.value,
        })),
    };
}
/**
 * Transforms a CustomerGroup entity to its API response format.
 *
 * @param group - The group entity to transform
 * @param memberCount - The count of members in the group
 * @returns The group response object
 */
function toGroupResponse(group, memberCount) {
    const count = memberCount ?? group.memberCount ?? 0;
    return {
        id: group.id,
        name: group.name,
        description: group.description,
        isStatic: group.isStatic,
        memberIds: group.isStatic ? group.memberIds : null,
        criteria: group.isStatic ? null : toCriteriaResponse(group.criteria),
        memberCount: count,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
    };
}
/**
 * Transforms a Customer entity to a group member response format.
 */
function toGroupMemberResponse(customer) {
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
 * Transforms a paginated group result to its API response format.
 *
 * @param data - Array of group entities with member counts
 * @param total - Total number of groups matching the query
 * @param page - Current page number
 * @param limit - Items per page
 * @param totalPages - Total number of pages
 * @returns The paginated group response object
 */
function toPaginatedGroupResponse(data, total, page, limit, totalPages) {
    return {
        data: data.map((group) => toGroupResponse(group, group.memberCount)),
        meta: {
            total,
            page,
            limit,
            totalPages,
        },
    };
}
/**
 * Transforms a paginated member result to its API response format.
 *
 * @param data - Array of customer entities
 * @param total - Total number of members matching the query
 * @param page - Current page number
 * @param limit - Items per page
 * @param totalPages - Total number of pages
 * @returns The paginated member response object
 */
function toPaginatedMemberResponse(data, total, page, limit, totalPages) {
    return {
        data: data.map(toGroupMemberResponse),
        meta: {
            total,
            page,
            limit,
            totalPages,
        },
    };
}
