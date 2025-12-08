import { GroupCriteriaDto } from './create-group.dto';
/**
 * DTO for updating an existing customer group.
 *
 * All fields are optional. Validation rules:
 * - name: 2-255 characters if provided
 * - description: max 500 characters if provided
 * - isStatic: boolean if provided
 * - memberIds: required if isStatic is being set to true
 * - criteria: required if isStatic is being set to false
 *
 * Note: Changing a group from static to dynamic (or vice versa) requires
 * providing the appropriate memberIds or criteria.
 */
export declare class UpdateGroupDto {
    name?: string;
    description?: string;
    isStatic?: boolean;
    memberIds?: string[];
    criteria?: GroupCriteriaDto;
}
