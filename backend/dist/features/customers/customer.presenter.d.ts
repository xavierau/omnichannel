import { Customer } from './customer.entity';
import { Tag } from '../tags/tag.entity';
/**
 * Response structure for a tag within customer responses.
 */
export interface TagResponse {
    id: string;
    name: string;
    color: string;
}
/**
 * Response structure for a customer.
 */
export interface CustomerResponse {
    id: string;
    name: string;
    whatsappNumber: string;
    tags: TagResponse[];
    customFields: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Response structure for paginated customer list.
 */
export interface PaginatedCustomerResponse {
    data: CustomerResponse[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
/**
 * Transforms a Tag entity to its API response format.
 *
 * @param tag - The tag entity to transform
 * @returns The tag response object
 */
export declare function toTagResponse(tag: Tag): TagResponse;
/**
 * Transforms a Customer entity to its API response format.
 * This function ensures consistent response structure across all endpoints.
 *
 * @param customer - The customer entity to transform
 * @returns The customer response object
 */
export declare function toCustomerResponse(customer: Customer): CustomerResponse;
/**
 * Transforms a paginated customer result to its API response format.
 *
 * @param data - Array of customer entities
 * @param total - Total number of customers matching the query
 * @param page - Current page number
 * @param limit - Items per page
 * @param totalPages - Total number of pages
 * @returns The paginated customer response object
 */
export declare function toPaginatedCustomerResponse(data: Customer[], total: number, page: number, limit: number, totalPages: number): PaginatedCustomerResponse;
