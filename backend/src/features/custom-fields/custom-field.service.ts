import { singleton, inject } from 'tsyringe';
import { CustomFieldRepository } from './custom-field.repository';
import {
  CustomFieldDefinition,
  CustomFieldEntityType,
  CustomFieldType,
} from './custom-field.entity';
import {
  CreateCustomFieldDto,
  UpdateCustomFieldDto,
  CustomFieldResponseDto,
} from './dto/custom-field.dto';
import { logger } from '../../config/logger.config';

/**
 * Service for managing custom field definitions.
 *
 * Handles CRUD operations and business logic for tenant-defined custom fields.
 */
@singleton()
export class CustomFieldService {
  constructor(
    @inject(CustomFieldRepository)
    private customFieldRepo: CustomFieldRepository
  ) {}

  /**
   * Get all custom fields for a tenant.
   *
   * @param tenantId - Tenant ID
   * @param entityType - Optional filter by entity type
   * @returns List of custom fields
   */
  async getByTenant(
    tenantId: string,
    entityType?: CustomFieldEntityType
  ): Promise<CustomFieldResponseDto[]> {
    const fields = await this.customFieldRepo.findByTenant(tenantId, {
      entityType,
    });

    return fields.map((field) => CustomFieldResponseDto.fromEntity(field));
  }

  /**
   * Get a custom field by ID.
   *
   * @param id - Custom field ID
   * @param tenantId - Tenant ID for authorization
   * @returns Custom field or null
   */
  async getById(
    id: string,
    tenantId: string
  ): Promise<CustomFieldResponseDto | null> {
    const field = await this.customFieldRepo.findByIdAndTenant(id, tenantId);

    if (!field) {
      return null;
    }

    return CustomFieldResponseDto.fromEntity(field);
  }

  /**
   * Create a new custom field.
   *
   * @param tenantId - Tenant ID
   * @param dto - Creation data
   * @returns Created custom field
   * @throws Error if validation fails
   */
  async create(
    tenantId: string,
    dto: CreateCustomFieldDto
  ): Promise<CustomFieldResponseDto> {
    // Validate field key format (alphanumeric and underscores only)
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(dto.fieldKey)) {
      throw new Error(
        'Field key must start with a letter and contain only letters, numbers, and underscores'
      );
    }

    // Check for duplicate field key
    const existingField = await this.customFieldRepo.fieldKeyExists(
      tenantId,
      dto.entityType,
      dto.fieldKey
    );

    if (existingField) {
      throw new Error(
        `Field key '${dto.fieldKey}' already exists for entity type '${dto.entityType}'`
      );
    }

    // Validate options for SELECT/MULTISELECT types
    this.validateOptionsForFieldType(dto.fieldType, dto.options);

    // Validate default value matches field type
    if (dto.defaultValue !== undefined && dto.defaultValue !== null) {
      this.validateDefaultValue(dto.fieldType, dto.defaultValue);
    }

    // Get the next display order if not specified
    let displayOrder = dto.displayOrder;
    if (displayOrder === undefined) {
      const maxOrder = await this.customFieldRepo.getMaxDisplayOrder(
        tenantId,
        dto.entityType
      );
      displayOrder = maxOrder + 1;
    }

    const field = await this.customFieldRepo.create({
      tenantId,
      entityType: dto.entityType,
      fieldKey: dto.fieldKey,
      displayLabel: dto.displayLabel,
      description: dto.description || null,
      fieldType: dto.fieldType,
      validation: dto.validation || {},
      defaultValue: dto.defaultValue ?? null,
      options: dto.options || null,
      displayOrder,
      isVisible: dto.isVisible ?? true,
      isSearchable: dto.isSearchable ?? false,
      isFilterable: dto.isFilterable ?? false,
    });

    logger.info('Custom field created', {
      customFieldId: field.id,
      tenantId,
      entityType: dto.entityType,
      fieldKey: dto.fieldKey,
    });

    return CustomFieldResponseDto.fromEntity(field);
  }

  /**
   * Update a custom field.
   *
   * @param id - Custom field ID
   * @param tenantId - Tenant ID for authorization
   * @param dto - Update data
   * @returns Updated custom field
   */
  async update(
    id: string,
    tenantId: string,
    dto: UpdateCustomFieldDto
  ): Promise<CustomFieldResponseDto | null> {
    const existing = await this.customFieldRepo.findByIdAndTenant(id, tenantId);
    if (!existing) {
      return null;
    }

    const updateData: Partial<CustomFieldDefinition> = {};

    if (dto.displayLabel !== undefined) {
      updateData.displayLabel = dto.displayLabel;
    }

    if (dto.description !== undefined) {
      updateData.description = dto.description || null;
    }

    if (dto.validation !== undefined) {
      updateData.validation = dto.validation;
    }

    if (dto.options !== undefined) {
      // Validate options for SELECT/MULTISELECT types
      this.validateOptionsForFieldType(existing.fieldType, dto.options);
      updateData.options = dto.options || null;
    }

    if (dto.defaultValue !== undefined) {
      if (dto.defaultValue !== null) {
        this.validateDefaultValue(existing.fieldType, dto.defaultValue);
      }
      updateData.defaultValue = dto.defaultValue;
    }

    if (dto.displayOrder !== undefined) {
      updateData.displayOrder = dto.displayOrder;
    }

    if (dto.isVisible !== undefined) {
      updateData.isVisible = dto.isVisible;
    }

    if (dto.isSearchable !== undefined) {
      updateData.isSearchable = dto.isSearchable;
    }

    if (dto.isFilterable !== undefined) {
      updateData.isFilterable = dto.isFilterable;
    }

    const updated = await this.customFieldRepo.update(id, tenantId, updateData);
    if (!updated) {
      return null;
    }

    logger.info('Custom field updated', {
      customFieldId: id,
      tenantId,
      fieldsUpdated: Object.keys(updateData),
    });

    return CustomFieldResponseDto.fromEntity(updated);
  }

  /**
   * Delete a custom field.
   *
   * @param id - Custom field ID
   * @param tenantId - Tenant ID for authorization
   * @returns true if deleted
   */
  async delete(id: string, tenantId: string): Promise<boolean> {
    const deleted = await this.customFieldRepo.delete(id, tenantId);

    if (deleted) {
      logger.info('Custom field deleted', {
        customFieldId: id,
        tenantId,
      });
    }

    return deleted;
  }

  /**
   * Reorder custom fields for an entity type.
   *
   * @param tenantId - Tenant ID
   * @param entityType - Entity type to reorder
   * @param orderedIds - Array of field IDs in desired order
   * @returns true if successful
   */
  async reorder(
    tenantId: string,
    entityType: CustomFieldEntityType,
    orderedIds: string[]
  ): Promise<boolean> {
    const success = await this.customFieldRepo.reorder(
      tenantId,
      entityType,
      orderedIds
    );

    if (success) {
      logger.info('Custom fields reordered', {
        tenantId,
        entityType,
        fieldCount: orderedIds.length,
      });
    }

    return success;
  }

  /**
   * Validate that options are provided for SELECT/MULTISELECT field types.
   */
  private validateOptionsForFieldType(
    fieldType: CustomFieldType,
    options: unknown[] | undefined | null
  ): void {
    const requiresOptions =
      fieldType === CustomFieldType.SELECT ||
      fieldType === CustomFieldType.MULTISELECT;

    if (requiresOptions && (!options || options.length === 0)) {
      throw new Error(
        `Options are required for ${fieldType} field type`
      );
    }

    if (!requiresOptions && options && options.length > 0) {
      throw new Error(
        `Options are not allowed for ${fieldType} field type`
      );
    }
  }

  /**
   * Validate that the default value matches the field type.
   */
  private validateDefaultValue(
    fieldType: CustomFieldType,
    defaultValue: unknown
  ): void {
    switch (fieldType) {
      case CustomFieldType.TEXT:
      case CustomFieldType.TEXTAREA:
      case CustomFieldType.PHONE:
      case CustomFieldType.EMAIL:
      case CustomFieldType.URL:
      case CustomFieldType.DATE:
      case CustomFieldType.DATETIME:
      case CustomFieldType.SELECT:
        if (typeof defaultValue !== 'string') {
          throw new Error(
            `Default value for ${fieldType} must be a string`
          );
        }
        break;

      case CustomFieldType.NUMBER:
        if (typeof defaultValue !== 'number') {
          throw new Error(
            `Default value for ${fieldType} must be a number`
          );
        }
        break;

      case CustomFieldType.BOOLEAN:
        if (typeof defaultValue !== 'boolean') {
          throw new Error(
            `Default value for ${fieldType} must be a boolean`
          );
        }
        break;

      case CustomFieldType.MULTISELECT:
        if (!Array.isArray(defaultValue)) {
          throw new Error(
            `Default value for ${fieldType} must be an array of strings`
          );
        }
        if (!defaultValue.every((v) => typeof v === 'string')) {
          throw new Error(
            `Default value for ${fieldType} must be an array of strings`
          );
        }
        break;
    }
  }
}
