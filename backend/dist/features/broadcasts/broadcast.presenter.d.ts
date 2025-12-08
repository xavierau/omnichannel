import { Broadcast } from './broadcast.entity';
import { BroadcastStatus, RecipientType } from './enums';
import { TemplateCategory } from '../templates/enums';
/**
 * Response structure for variable configuration.
 */
export interface VariableConfigResponse {
    index: number;
    sourceType: 'static' | 'customer_field';
    staticValue?: string;
    customerField?: string;
}
/**
 * Response structure for header configuration.
 */
export interface HeaderConfigResponse {
    type: 'text' | 'image' | 'video' | 'document';
    textVariable?: VariableConfigResponse;
    mediaUrl?: string;
}
/**
 * Response structure for button variable configuration.
 */
export interface ButtonVariableConfigResponse {
    buttonIndex: number;
    variable: VariableConfigResponse;
}
/**
 * Response structure for template variables configuration.
 */
export interface TemplateVariablesConfigResponse {
    header?: HeaderConfigResponse;
    bodyVariables: VariableConfigResponse[];
    buttonVariables: ButtonVariableConfigResponse[];
}
/**
 * Full response structure for a single broadcast.
 */
export interface BroadcastResponse {
    id: string;
    name: string;
    description: string | null;
    templateId: string;
    templateName: string;
    templateCategory: TemplateCategory;
    templateLanguage: string;
    recipientType: RecipientType;
    groupId: string | null;
    customerIds: string[] | null;
    totalRecipients: number;
    templateVariables: TemplateVariablesConfigResponse;
    isImmediate: boolean;
    scheduledAt: Date | null;
    timezone: string;
    status: BroadcastStatus;
    sentCount: number;
    deliveredCount: number;
    readCount: number;
    failedCount: number;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
    customFields: Record<string, unknown>;
}
/**
 * Lightweight response structure for list view.
 * Excludes detailed configurations to reduce payload size.
 */
export interface BroadcastListResponse {
    id: string;
    name: string;
    description: string | null;
    templateName: string;
    templateCategory: TemplateCategory;
    recipientType: RecipientType;
    totalRecipients: number;
    isImmediate: boolean;
    scheduledAt: Date | null;
    status: BroadcastStatus;
    sentCount: number;
    deliveredCount: number;
    readCount: number;
    failedCount: number;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Response structure for paginated broadcast list.
 */
export interface PaginatedBroadcastResponse {
    data: BroadcastListResponse[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
/**
 * Transforms a Broadcast entity to its full API response format.
 * Used for single broadcast responses (get by ID, create, update).
 *
 * @param broadcast - The broadcast entity to transform
 * @returns The full broadcast response object
 */
export declare function toBroadcastResponse(broadcast: Broadcast): BroadcastResponse;
/**
 * Transforms a Broadcast entity to its lightweight list response format.
 * Used for list endpoints to reduce payload size.
 *
 * @param broadcast - The broadcast entity to transform
 * @returns The lightweight broadcast response object
 */
export declare function toBroadcastListResponse(broadcast: Broadcast): BroadcastListResponse;
/**
 * Transforms a paginated broadcast result to its API response format.
 *
 * @param data - Array of broadcast entities
 * @param total - Total number of broadcasts matching the query
 * @param page - Current page number
 * @param limit - Items per page
 * @param totalPages - Total number of pages
 * @returns The paginated broadcast response object
 */
export declare function toPaginatedBroadcastResponse(data: Broadcast[], total: number, page: number, limit: number, totalPages: number): PaginatedBroadcastResponse;
