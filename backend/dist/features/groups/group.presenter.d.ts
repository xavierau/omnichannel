import { CustomerGroup } from './group.entity';
import { Customer } from '../customers/customer.entity';
/**
 * Response structure for a tag within member responses.
 */
export interface TagResponse {
    id: string;
    name: string;
    color: string;
}
/**
 * Response structure for custom field conditions in criteria.
 */
export interface CustomFieldConditionResponse {
    fieldKey: string;
    operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan';
    value: string | number | boolean;
}
/**
 * Response structure for group criteria.
 */
export interface GroupCriteriaResponse {
    tagIds?: string[];
    createdAfter?: string;
    createdBefore?: string;
    customFieldConditions?: CustomFieldConditionResponse[];
}
/**
 * Response structure for a customer group.
 */
export interface GroupResponse {
    id: string;
    name: string;
    description: string | null;
    isStatic: boolean;
    memberIds: string[] | null;
    criteria: GroupCriteriaResponse | null;
    memberCount: number;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Response structure for a group member (customer).
 */
export interface GroupMemberResponse {
    id: string;
    name: string;
    whatsappNumber: string;
    tags: TagResponse[];
    customFields: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Response structure for paginated groups.
 */
export interface PaginatedGroupResponse {
    data: GroupResponse[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
/**
 * Response structure for paginated group members.
 */
export interface PaginatedGroupMemberResponse {
    data: GroupMemberResponse[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
/**
 * Transforms a CustomerGroup entity to its API response format.
 *
 * @param group - The group entity to transform
 * @param memberCount - The count of members in the group
 * @returns The group response object
 */
export declare function toGroupResponse(group: CustomerGroup & {
    memberCount?: number;
}, memberCount?: number): GroupResponse;
/**
 * Transforms a Customer entity to a group member response format.
 */
export declare function toGroupMemberResponse(customer: Customer): GroupMemberResponse;
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
export declare function toPaginatedGroupResponse(data: Array<CustomerGroup & {
    memberCount: number;
}>, total: number, page: number, limit: number, totalPages: number): PaginatedGroupResponse;
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
export declare function toPaginatedMemberResponse(data: Customer[], total: number, page: number, limit: number, totalPages: number): PaginatedGroupMemberResponse;
