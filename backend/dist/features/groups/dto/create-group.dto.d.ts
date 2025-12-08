/**
 * Represents a custom field condition for dynamic group criteria.
 */
export declare class CustomFieldConditionDto {
    fieldKey: string;
    operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan';
    value: string | number | boolean;
}
/**
 * Represents criteria for dynamic group membership resolution.
 */
export declare class GroupCriteriaDto {
    tagIds?: string[];
    createdAfter?: string;
    createdBefore?: string;
    customFieldConditions?: CustomFieldConditionDto[];
}
/**
 * DTO for creating a new customer group.
 *
 * Validation rules:
 * - name: required, 2-255 characters
 * - description: optional, max 500 characters
 * - isStatic: required boolean
 * - memberIds: required if isStatic=true (array of customer UUIDs)
 * - criteria: required if isStatic=false (dynamic group criteria)
 */
export declare class CreateGroupDto {
    name: string;
    description?: string;
    isStatic: boolean;
    memberIds?: string[];
    criteria?: GroupCriteriaDto;
}
