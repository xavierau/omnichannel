import { BroadcastStatus } from '../enums';
import { TemplateCategory } from '../../templates/enums';
/**
 * DTO for broadcast list query parameters.
 * Supports filtering, searching, pagination, and sorting.
 */
export declare class BroadcastQueryDto {
    search?: string;
    statuses?: BroadcastStatus[];
    templateCategories?: TemplateCategory[];
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc' | 'ASC' | 'DESC';
}
