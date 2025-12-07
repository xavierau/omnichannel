import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';

/**
 * Entity types that can have custom fields.
 */
export enum CustomFieldEntityType {
  CUSTOMER = 'CUSTOMER',
  BROADCAST = 'BROADCAST',
  TEMPLATE = 'TEMPLATE',
  CONVERSATION = 'CONVERSATION',
}

/**
 * Supported field types for custom fields.
 */
export enum CustomFieldType {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  SELECT = 'SELECT',
  MULTISELECT = 'MULTISELECT',
  BOOLEAN = 'BOOLEAN',
  PHONE = 'PHONE',
  EMAIL = 'EMAIL',
  URL = 'URL',
}

/**
 * Validation rules for a custom field.
 */
export interface CustomFieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
  min?: number;
  max?: number;
  decimal?: boolean;
  precision?: number;
}

/**
 * Option for SELECT and MULTISELECT field types.
 */
export interface CustomFieldOption {
  id: string;
  label: string;
  value: string;
  color?: string;
  order: number;
}

/**
 * CustomFieldDefinition entity represents a tenant-defined custom field.
 *
 * Custom fields allow tenants to extend entities (Customer, Broadcast, etc.)
 * with additional data fields specific to their business needs.
 */
@Entity('custom_field_definitions')
@Index(['tenantId', 'entityType'])
@Index(['tenantId', 'entityType', 'fieldKey'], { unique: true })
export class CustomFieldDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Index()
  @Column({
    name: 'entity_type',
    type: 'enum',
    enum: CustomFieldEntityType,
  })
  entityType: CustomFieldEntityType;

  @Column({ name: 'field_key', type: 'varchar', length: 100 })
  fieldKey: string;

  @Column({ name: 'display_label', type: 'varchar', length: 255 })
  displayLabel: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    name: 'field_type',
    type: 'enum',
    enum: CustomFieldType,
  })
  fieldType: CustomFieldType;

  @Column({ type: 'jsonb', default: '{}' })
  validation: CustomFieldValidation;

  @Column({ name: 'default_value', type: 'jsonb', nullable: true })
  defaultValue: string | number | boolean | string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  options: CustomFieldOption[] | null;

  @Column({ name: 'display_order', type: 'integer', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_visible', type: 'boolean', default: true })
  isVisible: boolean;

  @Column({ name: 'is_searchable', type: 'boolean', default: false })
  isSearchable: boolean;

  @Column({ name: 'is_filterable', type: 'boolean', default: false })
  isFilterable: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
