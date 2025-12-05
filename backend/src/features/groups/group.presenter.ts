import { CustomerGroup, GroupCriteria } from './group.entity';
import { Customer } from '../customers/customer.entity';
import { Tag } from '../tags/tag.entity';

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
 * Transforms a Tag entity to its API response format.
 */
function toTagResponse(tag: Tag): TagResponse {
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
  };
}

/**
 * Transforms group criteria to its API response format.
 */
function toCriteriaResponse(criteria: GroupCriteria | null): GroupCriteriaResponse | null {
  if (!criteria) return null;

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
export function toGroupResponse(
  group: CustomerGroup & { memberCount?: number },
  memberCount?: number
): GroupResponse {
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
export function toGroupMemberResponse(customer: Customer): GroupMemberResponse {
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
export function toPaginatedGroupResponse(
  data: Array<CustomerGroup & { memberCount: number }>,
  total: number,
  page: number,
  limit: number,
  totalPages: number
): PaginatedGroupResponse {
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
export function toPaginatedMemberResponse(
  data: Customer[],
  total: number,
  page: number,
  limit: number,
  totalPages: number
): PaginatedGroupMemberResponse {
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
