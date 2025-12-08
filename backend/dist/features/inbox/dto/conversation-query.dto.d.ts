import { ConversationStatus } from '../enums';
/**
 * DTO for conversation list query parameters.
 * Supports filtering by status, searching, pagination, and sorting.
 */
export declare class ConversationQueryDto {
    status?: ConversationStatus[];
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: 'lastMessageAt' | 'createdAt' | 'unreadCount';
    sortOrder?: 'asc' | 'desc' | 'ASC' | 'DESC';
}
