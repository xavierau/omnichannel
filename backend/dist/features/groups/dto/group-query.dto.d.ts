/**
 * DTO for querying customer groups with pagination and filtering.
 */
export declare class GroupQueryDto {
    search?: string;
    isStatic?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc' | 'ASC' | 'DESC';
}
/**
 * DTO for querying group members with pagination.
 */
export declare class GroupMembersQueryDto {
    page?: number;
    limit?: number;
}
