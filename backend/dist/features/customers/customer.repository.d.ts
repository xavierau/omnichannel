import { Customer } from './customer.entity';
import { Tag } from '../tags/tag.entity';
export interface CustomerQueryOptions {
    search?: string;
    tagIds?: string[];
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc' | 'ASC' | 'DESC';
}
export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
/**
 * Maximum number of records that can be exported at once.
 * This prevents memory exhaustion from exporting millions of records.
 */
export declare const MAX_EXPORT_RECORDS = 10000;
export declare class CustomerRepository {
    private _repository;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    private get repository();
    findById(id: string, tenantId: string): Promise<Customer | null>;
    /**
     * Find multiple customers by their IDs with tenant isolation.
     * This is the batch alternative to individual findById calls.
     * Prevents N+1 queries when resolving multiple customers.
     *
     * @param ids - Array of customer IDs to find
     * @param tenantId - The tenant ID for isolation
     * @returns Array of found customers (may be less than requested if some don't exist)
     */
    findByIds(ids: string[], tenantId: string): Promise<Customer[]>;
    findByWhatsApp(whatsappNumber: string, tenantId: string): Promise<Customer | null>;
    /**
     * Find all customers for a tenant with pagination and filtering.
     *
     * Note: Uses separate queries for data and count to avoid TypeORM's
     * getManyAndCount() bug with nullable leftJoinAndSelect relations
     * that causes "Cannot read properties of undefined (reading 'databaseName')" error.
     */
    findAll(tenantId: string, options?: CustomerQueryOptions): Promise<PaginatedResult<Customer>>;
    create(data: Partial<Customer>, tags?: Tag[]): Promise<Customer>;
    update(id: string, tenantId: string, data: Partial<Customer>, tags?: Tag[]): Promise<Customer | null>;
    delete(id: string, tenantId: string): Promise<boolean>;
    bulkDelete(ids: string[], tenantId: string): Promise<number>;
    bulkUpdateTags(customerIds: string[], tags: Tag[], action: 'add' | 'remove' | 'replace', tenantId: string): Promise<number>;
    existsByWhatsApp(whatsappNumber: string, tenantId: string, excludeId?: string): Promise<boolean>;
    count(tenantId: string): Promise<number>;
    /**
     * Find all customers for export with filtering.
     *
     * Note: Uses two-phase query to avoid TypeORM's bug with nullable
     * leftJoinAndSelect relations combined with limit/take.
     */
    findAllForExport(tenantId: string, options?: CustomerQueryOptions): Promise<Customer[]>;
}
