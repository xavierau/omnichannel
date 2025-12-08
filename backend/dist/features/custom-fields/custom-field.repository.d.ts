import { CustomFieldDefinition, CustomFieldEntityType } from './custom-field.entity';
/**
 * Query options for custom fields.
 */
export interface CustomFieldQueryOptions {
    entityType?: CustomFieldEntityType;
    isVisible?: boolean;
    isSearchable?: boolean;
    isFilterable?: boolean;
}
export declare class CustomFieldRepository {
    private _repository;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     * This prevents errors when the DI container instantiates this class before
     * the database connection is established.
     */
    private get repository();
    /**
     * Find all custom fields for a tenant.
     */
    findByTenant(tenantId: string, options?: CustomFieldQueryOptions): Promise<CustomFieldDefinition[]>;
    /**
     * Find a custom field by ID.
     */
    findById(id: string): Promise<CustomFieldDefinition | null>;
    /**
     * Find a custom field by ID for a specific tenant.
     */
    findByIdAndTenant(id: string, tenantId: string): Promise<CustomFieldDefinition | null>;
    /**
     * Find a custom field by field key for a specific entity type and tenant.
     */
    findByFieldKey(tenantId: string, entityType: CustomFieldEntityType, fieldKey: string): Promise<CustomFieldDefinition | null>;
    /**
     * Create a new custom field.
     */
    create(data: Partial<CustomFieldDefinition>): Promise<CustomFieldDefinition>;
    /**
     * Update a custom field.
     */
    update(id: string, tenantId: string, data: Partial<CustomFieldDefinition>): Promise<CustomFieldDefinition | null>;
    /**
     * Delete a custom field.
     */
    delete(id: string, tenantId: string): Promise<boolean>;
    /**
     * Get the maximum display order for a given entity type.
     */
    getMaxDisplayOrder(tenantId: string, entityType: CustomFieldEntityType): Promise<number>;
    /**
     * Reorder custom fields for a given entity type.
     *
     * @param tenantId - Tenant ID
     * @param entityType - Entity type to reorder
     * @param orderedIds - Array of field IDs in the desired order
     * @returns true if all fields were updated
     */
    reorder(tenantId: string, entityType: CustomFieldEntityType, orderedIds: string[]): Promise<boolean>;
    /**
     * Count custom fields for a tenant.
     */
    countByTenant(tenantId: string): Promise<number>;
    /**
     * Count custom fields by entity type for a tenant.
     */
    countByEntityType(tenantId: string, entityType: CustomFieldEntityType): Promise<number>;
    /**
     * Check if a field key exists for a given entity type and tenant.
     */
    fieldKeyExists(tenantId: string, entityType: CustomFieldEntityType, fieldKey: string, excludeId?: string): Promise<boolean>;
}
