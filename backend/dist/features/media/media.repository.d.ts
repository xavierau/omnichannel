import { Media, MediaType } from './media.entity';
/**
 * Data required to create a new media record
 */
export interface CreateMediaData {
    tenantId: string;
    type: MediaType;
    originalName: string;
    mimeType: string;
    fileSize: number;
    s3Key: string;
    s3Bucket: string;
    uploadedBy: string;
}
/**
 * Repository for Media entity operations
 *
 * Handles all database operations for media records.
 * All operations are tenant-scoped for multi-tenancy security.
 */
export declare class MediaRepository {
    private _repository;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    private get repository();
    /**
     * Creates a new media record
     *
     * @param data - Media creation data
     * @returns Created media record
     */
    create(data: CreateMediaData): Promise<Media>;
    /**
     * Finds a media record by ID within a tenant
     *
     * @param id - Media UUID
     * @param tenantId - Tenant UUID for scoping
     * @returns Media record or null if not found
     */
    findById(id: string, tenantId: string): Promise<Media | null>;
    /**
     * Deletes a media record by ID within a tenant
     *
     * @param id - Media UUID
     * @param tenantId - Tenant UUID for scoping
     * @returns True if record was deleted, false if not found
     */
    delete(id: string, tenantId: string): Promise<boolean>;
    /**
     * Finds all media records for a tenant
     *
     * @param tenantId - Tenant UUID for scoping
     * @param limit - Maximum number of records to return
     * @param offset - Number of records to skip
     * @returns Array of media records
     */
    findByTenant(tenantId: string, limit?: number, offset?: number): Promise<Media[]>;
    /**
     * Counts total media records for a tenant
     *
     * @param tenantId - Tenant UUID for scoping
     * @returns Count of media records
     */
    countByTenant(tenantId: string): Promise<number>;
    /**
     * Finds media records by type for a tenant
     *
     * @param tenantId - Tenant UUID for scoping
     * @param type - Media type filter
     * @returns Array of media records
     */
    findByType(tenantId: string, type: MediaType): Promise<Media[]>;
}
