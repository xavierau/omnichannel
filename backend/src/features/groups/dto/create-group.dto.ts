import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  IsUUID,
  IsDateString,
  IsIn,
  MinLength,
  MaxLength,
  ValidateNested,
  ValidateIf,
  ArrayNotEmpty,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Represents a custom field condition for dynamic group criteria.
 */
export class CustomFieldConditionDto {
  @IsString()
  @IsNotEmpty({ message: 'Field key is required' })
  @MaxLength(100, { message: 'Field key must not exceed 100 characters' })
  fieldKey: string;

  @IsString()
  @IsIn(['equals', 'contains', 'greaterThan', 'lessThan'], {
    message: 'Operator must be one of: equals, contains, greaterThan, lessThan',
  })
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan';

  @IsNotEmpty({ message: 'Value is required' })
  value: string | number | boolean;
}

/**
 * Represents criteria for dynamic group membership resolution.
 */
export class GroupCriteriaDto {
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Each tag ID must be a valid UUID' })
  tagIds?: string[];

  @IsOptional()
  @IsDateString({}, { message: 'createdAfter must be a valid ISO date string' })
  createdAfter?: string;

  @IsOptional()
  @IsDateString({}, { message: 'createdBefore must be a valid ISO date string' })
  createdBefore?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldConditionDto)
  customFieldConditions?: CustomFieldConditionDto[];
}

/**
 * DTO for creating a new customer group.
 *
 * Validation rules:
 * - name: required, 2-255 characters
 * - description: optional, max 500 characters
 * - isStatic: required boolean
 * - memberIds: required if isStatic=true (array of customer UUIDs)
 * - criteria: required if isStatic=false (dynamic group criteria)
 */
export class CreateGroupDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(255, { message: 'Name must not exceed 255 characters' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;

  @IsBoolean({ message: 'isStatic must be a boolean value' })
  isStatic: boolean;

  @ValidateIf((o) => o.isStatic === true)
  @IsArray({ message: 'memberIds must be an array when isStatic is true' })
  @ArrayNotEmpty({ message: 'memberIds must not be empty for static groups' })
  @IsUUID('4', { each: true, message: 'Each member ID must be a valid UUID' })
  memberIds?: string[];

  @ValidateIf((o) => o.isStatic === false)
  @ValidateNested()
  @Type(() => GroupCriteriaDto)
  @IsNotEmpty({ message: 'criteria is required for dynamic groups' })
  criteria?: GroupCriteriaDto;
}
