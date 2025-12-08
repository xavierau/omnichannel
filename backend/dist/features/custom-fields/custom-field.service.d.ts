import { CustomFieldRepository } from './custom-field.repository';
import { CustomFieldEntityType } from './custom-field.entity';
import { CreateCustomFieldDto, UpdateCustomFieldDto, CustomFieldResponseDto } from './dto/custom-field.dto';
/**
 * Service for managing custom field definitions.
 *
 * Handles CRUD operations and business logic for tenant-defined custom fields.
 */
export declare class CustomFieldService {
    private customFieldRepo;
    constructor(customFieldRepo: CustomFieldRepository);
    /**
     * Get all custom fields for a tenant.
     *
     * @param tenantId - Tenant ID
     * @param entityType - Optional filter by entity type
     * @returns List of custom fields
     */
    getByTenant(tenantId: string, entityType?: CustomFieldEntityType): Promise<CustomFieldResponseDto[]>;
    /**
     * Get a custom field by ID.
     *
     * @param id - Custom field ID
     * @param tenantId - Tenant ID for authorization
     * @returns Custom field or null
     */
    getById(id: string, tenantId: string): Promise<CustomFieldResponseDto | null>;
    /**
     * Create a new custom field.
     *
     * @param tenantId - Tenant ID
     * @param dto - Creation data
     * @returns Created custom field
     * @throws Error if validation fails
     */
    create(tenantId: string, dto: CreateCustomFieldDto): Promise<CustomFieldResponseDto>;
    /**
     * Update a custom field.
     *
     * @param id - Custom field ID
     * @param tenantId - Tenant ID for authorization
     * @param dto - Update data
     * @returns Updated custom field
     */
    update(id: string, tenantId: string, dto: UpdateCustomFieldDto): Promise<CustomFieldResponseDto | null>;
    /**
     * Delete a custom field.
     *
     * @param id - Custom field ID
     * @param tenantId - Tenant ID for authorization
     * @returns true if deleted
     */
    delete(id: string, tenantId: string): Promise<boolean>;
    /**
     * Reorder custom fields for an entity type.
     *
     * @param tenantId - Tenant ID
     * @param entityType - Entity type to reorder
     * @param orderedIds - Array of field IDs in desired order
     * @returns true if successful
     */
    reorder(tenantId: string, entityType: CustomFieldEntityType, orderedIds: string[]): Promise<boolean>;
    /**
     * Validate that options are provided for SELECT/MULTISELECT field types.
     */
    private validateOptionsForFieldType;
    /**
     * Validate that the default value matches the field type.
     */
    private validateDefaultValue;
}
