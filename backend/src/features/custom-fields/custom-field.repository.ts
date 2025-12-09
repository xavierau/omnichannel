import { singleton } from 'tsyringe';
import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/database.config';
import {
  CustomFieldDefinition,
  CustomFieldEntityType,
} from './custom-field.entity';

/**
 * Query options for custom fields.
 */
export interface CustomFieldQueryOptions {
  entityType?: CustomFieldEntityType;
  isVisible?: boolean;
  isSearchable?: boolean;
  isFilterable?: boolean;
}

@singleton()
export class CustomFieldRepository {
  private _repository: Repository<CustomFieldDefinition> | null = null;

  /**
   * Lazy initialization of the repository to ensure AppDataSource is initialized.
   * This prevents errors when the DI container instantiates this class before
   * the database connection is established.
   */
  private get repository(): Repository<CustomFieldDefinition> {
    if (!this._repository) {
      this._repository = AppDataSource.getRepository(CustomFieldDefinition);
    }
    return this._repository;
  }

  /**
   * Find all custom fields for a tenant.
   */
  async findByTenant(
    tenantId: string,
    options?: CustomFieldQueryOptions
  ): Promise<CustomFieldDefinition[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('field')
      .where('field.tenant_id = :tenantId', { tenantId });

    if (options?.entityType) {
      queryBuilder.andWhere('field.entity_type = :entityType', {
        entityType: options.entityType,
      });
    }

    if (options?.isVisible !== undefined) {
      queryBuilder.andWhere('field.is_visible = :isVisible', {
        isVisible: options.isVisible,
      });
    }

    if (options?.isSearchable !== undefined) {
      queryBuilder.andWhere('field.is_searchable = :isSearchable', {
        isSearchable: options.isSearchable,
      });
    }

    if (options?.isFilterable !== undefined) {
      queryBuilder.andWhere('field.is_filterable = :isFilterable', {
        isFilterable: options.isFilterable,
      });
    }

    return queryBuilder
      .orderBy('field.entityType', 'ASC')
      .addOrderBy('field.displayOrder', 'ASC')
      .getMany();
  }

  /**
   * Find a custom field by ID.
   */
  async findById(id: string): Promise<CustomFieldDefinition | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  /**
   * Find a custom field by ID for a specific tenant.
   */
  async findByIdAndTenant(
    id: string,
    tenantId: string
  ): Promise<CustomFieldDefinition | null> {
    return this.repository.findOne({
      where: { id, tenantId },
    });
  }

  /**
   * Find a custom field by field key for a specific entity type and tenant.
   */
  async findByFieldKey(
    tenantId: string,
    entityType: CustomFieldEntityType,
    fieldKey: string
  ): Promise<CustomFieldDefinition | null> {
    return this.repository.findOne({
      where: { tenantId, entityType, fieldKey },
    });
  }

  /**
   * Create a new custom field.
   */
  async create(
    data: Partial<CustomFieldDefinition>
  ): Promise<CustomFieldDefinition> {
    const field = this.repository.create(data);
    return this.repository.save(field);
  }

  /**
   * Update a custom field.
   */
  async update(
    id: string,
    tenantId: string,
    data: Partial<CustomFieldDefinition>
  ): Promise<CustomFieldDefinition | null> {
    const field = await this.findByIdAndTenant(id, tenantId);
    if (!field) {
      return null;
    }

    Object.assign(field, data);
    return this.repository.save(field);
  }

  /**
   * Delete a custom field.
   */
  async delete(id: string, tenantId: string): Promise<boolean> {
    const result = await this.repository.delete({ id, tenantId });
    return result.affected !== 0;
  }

  /**
   * Get the maximum display order for a given entity type.
   */
  async getMaxDisplayOrder(
    tenantId: string,
    entityType: CustomFieldEntityType
  ): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('field')
      .select('MAX(field.display_order)', 'maxOrder')
      .where('field.tenant_id = :tenantId', { tenantId })
      .andWhere('field.entity_type = :entityType', { entityType })
      .getRawOne();

    return result?.maxOrder ?? -1;
  }

  /**
   * Reorder custom fields for a given entity type.
   *
   * @param tenantId - Tenant ID
   * @param entityType - Entity type to reorder
   * @param orderedIds - Array of field IDs in the desired order
   * @returns true if all fields were updated
   */
  async reorder(
    tenantId: string,
    entityType: CustomFieldEntityType,
    orderedIds: string[]
  ): Promise<boolean> {
    // Verify all IDs belong to the tenant and entity type
    const existingFields = await this.repository.find({
      where: { tenantId, entityType },
      select: ['id'],
    });

    const existingIds = new Set(existingFields.map((f) => f.id));
    const validIds = orderedIds.filter((id) => existingIds.has(id));

    if (validIds.length !== orderedIds.length) {
      return false;
    }

    // Update display order for each field
    const updates = validIds.map((id, index) =>
      this.repository.update({ id, tenantId }, { displayOrder: index })
    );

    await Promise.all(updates);

    return true;
  }

  /**
   * Count custom fields for a tenant.
   */
  async countByTenant(tenantId: string): Promise<number> {
    return this.repository.count({ where: { tenantId } });
  }

  /**
   * Count custom fields by entity type for a tenant.
   */
  async countByEntityType(
    tenantId: string,
    entityType: CustomFieldEntityType
  ): Promise<number> {
    return this.repository.count({ where: { tenantId, entityType } });
  }

  /**
   * Check if a field key exists for a given entity type and tenant.
   */
  async fieldKeyExists(
    tenantId: string,
    entityType: CustomFieldEntityType,
    fieldKey: string,
    excludeId?: string
  ): Promise<boolean> {
    const queryBuilder = this.repository
      .createQueryBuilder('field')
      .where('field.tenant_id = :tenantId', { tenantId })
      .andWhere('field.entity_type = :entityType', { entityType })
      .andWhere('field.field_key = :fieldKey', { fieldKey });

    if (excludeId) {
      queryBuilder.andWhere('field.id != :excludeId', { excludeId });
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }
}
