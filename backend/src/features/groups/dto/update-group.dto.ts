import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  IsUUID,
  MinLength,
  MaxLength,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GroupCriteriaDto } from './create-group.dto';

/**
 * DTO for updating an existing customer group.
 *
 * All fields are optional. Validation rules:
 * - name: 2-255 characters if provided
 * - description: max 500 characters if provided
 * - isStatic: boolean if provided
 * - memberIds: required if isStatic is being set to true
 * - criteria: required if isStatic is being set to false
 *
 * Note: Changing a group from static to dynamic (or vice versa) requires
 * providing the appropriate memberIds or criteria.
 */
export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(255, { message: 'Name must not exceed 255 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;

  @IsOptional()
  @IsBoolean({ message: 'isStatic must be a boolean value' })
  isStatic?: boolean;

  @IsOptional()
  @ValidateIf((o) => o.isStatic === true)
  @IsArray({ message: 'memberIds must be an array' })
  @IsUUID('4', { each: true, message: 'Each member ID must be a valid UUID' })
  memberIds?: string[];

  @IsOptional()
  @ValidateIf((o) => o.isStatic === false)
  @ValidateNested()
  @Type(() => GroupCriteriaDto)
  criteria?: GroupCriteriaDto;
}
