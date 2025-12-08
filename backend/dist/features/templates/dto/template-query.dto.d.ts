import { TemplateCategory, TemplateStatus } from '../enums';
/**
 * DTO for template list query parameters.
 * Supports filtering, pagination, and sorting.
 */
export declare class TemplateQueryDto {
    search?: string;
    categories?: TemplateCategory[];
    statuses?: TemplateStatus[];
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc' | 'ASC' | 'DESC';
}
