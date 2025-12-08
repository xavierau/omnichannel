import { Tenant } from '../tenants/tenant.entity';
/**
 * Entity types that can have custom fields.
 */
export declare enum CustomFieldEntityType {
    CUSTOMER = "CUSTOMER",
    BROADCAST = "BROADCAST",
    TEMPLATE = "TEMPLATE",
    CONVERSATION = "CONVERSATION"
}
/**
 * Supported field types for custom fields.
 */
export declare enum CustomFieldType {
    TEXT = "TEXT",
    TEXTAREA = "TEXTAREA",
    NUMBER = "NUMBER",
    DATE = "DATE",
    DATETIME = "DATETIME",
    SELECT = "SELECT",
    MULTISELECT = "MULTISELECT",
    BOOLEAN = "BOOLEAN",
    PHONE = "PHONE",
    EMAIL = "EMAIL",
    URL = "URL"
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
export declare class CustomFieldDefinition {
    id: string;
    tenantId: string;
    tenant: Tenant;
    entityType: CustomFieldEntityType;
    fieldKey: string;
    displayLabel: string;
    description: string | null;
    fieldType: CustomFieldType;
    validation: CustomFieldValidation;
    defaultValue: string | number | boolean | string[] | null;
    options: CustomFieldOption[] | null;
    displayOrder: number;
    isVisible: boolean;
    isSearchable: boolean;
    isFilterable: boolean;
    createdAt: Date;
    updatedAt: Date;
}
