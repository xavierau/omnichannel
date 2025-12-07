import {
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  IsArray,
  IsObject,
  MaxLength,
  MinLength,
  ValidateNested,
  IsInt,
  Min,
  ArrayMinSize,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CustomFieldDefinition,
  CustomFieldEntityType,
  CustomFieldType,
  CustomFieldValidation,
  CustomFieldOption,
} from '../custom-field.entity';

/**
 * DTO for validation rules.
 */
export class ValidationDto implements CustomFieldValidation {
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  minLength?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxLength?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  pattern?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  patternMessage?: string;

  @IsOptional()
  @IsNumber()
  min?: number;

  @IsOptional()
  @IsNumber()
  max?: number;

  @IsOptional()
  @IsBoolean()
  decimal?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  precision?: number;
}

/**
 * DTO for select/multiselect options.
 */
export class OptionDto implements CustomFieldOption {
  @IsString()
  @MinLength(1)
  id: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  label: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  value: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @IsInt()
  @Min(0)
  order: number;
}

/**
 * DTO for creating a custom field.
 */
export class CreateCustomFieldDto {
  @IsEnum(CustomFieldEntityType, {
    message: `Entity type must be one of: ${Object.values(CustomFieldEntityType).join(', ')}`,
  })
  entityType: CustomFieldEntityType;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  fieldKey: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  displayLabel: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsEnum(CustomFieldType, {
    message: `Field type must be one of: ${Object.values(CustomFieldType).join(', ')}`,
  })
  fieldType: CustomFieldType;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ValidationDto)
  validation?: ValidationDto;

  @IsOptional()
  defaultValue?: string | number | boolean | string[] | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options?: OptionDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsBoolean()
  isSearchable?: boolean;

  @IsOptional()
  @IsBoolean()
  isFilterable?: boolean;
}

/**
 * DTO for updating a custom field.
 */
export class UpdateCustomFieldDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  displayLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ValidationDto)
  validation?: ValidationDto;

  @IsOptional()
  defaultValue?: string | number | boolean | string[] | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options?: OptionDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsBoolean()
  isSearchable?: boolean;

  @IsOptional()
  @IsBoolean()
  isFilterable?: boolean;
}

/**
 * DTO for reordering custom fields.
 */
export class ReorderCustomFieldsDto {
  @IsEnum(CustomFieldEntityType, {
    message: `Entity type must be one of: ${Object.values(CustomFieldEntityType).join(', ')}`,
  })
  entityType: CustomFieldEntityType;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  orderedIds: string[];
}

/**
 * Response DTO for custom fields.
 */
export class CustomFieldResponseDto {
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

  static fromEntity(entity: CustomFieldDefinition): CustomFieldResponseDto {
    const dto = new CustomFieldResponseDto();
    dto.id = entity.id;
    dto.tenantId = entity.tenantId;
    dto.entityType = entity.entityType;
    dto.fieldKey = entity.fieldKey;
    dto.displayLabel = entity.displayLabel;
    dto.description = entity.description;
    dto.fieldType = entity.fieldType;
    dto.validation = entity.validation;
    dto.defaultValue = entity.defaultValue;
    dto.options = entity.options;
    dto.displayOrder = entity.displayOrder;
    dto.isVisible = entity.isVisible;
    dto.isSearchable = entity.isSearchable;
    dto.isFilterable = entity.isFilterable;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
