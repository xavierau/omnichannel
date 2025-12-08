import { CustomFieldDefinition, CustomFieldEntityType, CustomFieldType, CustomFieldValidation, CustomFieldOption } from '../custom-field.entity';
/**
 * DTO for validation rules.
 */
export declare class ValidationDto implements CustomFieldValidation {
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
 * DTO for select/multiselect options.
 */
export declare class OptionDto implements CustomFieldOption {
    id: string;
    label: string;
    value: string;
    color?: string;
    order: number;
}
/**
 * DTO for creating a custom field.
 */
export declare class CreateCustomFieldDto {
    entityType: CustomFieldEntityType;
    fieldKey: string;
    displayLabel: string;
    description?: string;
    fieldType: CustomFieldType;
    validation?: ValidationDto;
    defaultValue?: string | number | boolean | string[] | null;
    options?: OptionDto[];
    displayOrder?: number;
    isVisible?: boolean;
    isSearchable?: boolean;
    isFilterable?: boolean;
}
/**
 * DTO for updating a custom field.
 */
export declare class UpdateCustomFieldDto {
    displayLabel?: string;
    description?: string;
    validation?: ValidationDto;
    defaultValue?: string | number | boolean | string[] | null;
    options?: OptionDto[];
    displayOrder?: number;
    isVisible?: boolean;
    isSearchable?: boolean;
    isFilterable?: boolean;
}
/**
 * DTO for reordering custom fields.
 */
export declare class ReorderCustomFieldsDto {
    entityType: CustomFieldEntityType;
    orderedIds: string[];
}
/**
 * Response DTO for custom fields.
 */
export declare class CustomFieldResponseDto {
    id: string;
    tenantId: string;
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
    static fromEntity(entity: CustomFieldDefinition): CustomFieldResponseDto;
}
