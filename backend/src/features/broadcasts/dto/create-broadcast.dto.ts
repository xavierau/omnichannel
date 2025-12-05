import {
  IsString,
  IsArray,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsDate,
  MinLength,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateIf,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RecipientType } from '../enums';
import { TemplateVariablesConfigDto } from './variable-config.dto';
import { IsFutureDate } from './validators/is-future-date.validator';
import { IsValidCustomFields } from '@features/customers/dto/custom-fields.validator';

/**
 * DTO for creating a new broadcast.
 * Includes comprehensive validation for all fields including conditional requirements.
 */
export class CreateBroadcastDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;

  @IsUUID('4', { message: 'Template ID must be a valid UUID' })
  templateId: string;

  @IsString()
  @MinLength(2, { message: 'Template language must be at least 2 characters' })
  @MaxLength(10, { message: 'Template language must not exceed 10 characters' })
  templateLanguage: string;

  @IsEnum(RecipientType, {
    message: 'Recipient type must be either "group" or "customers"',
  })
  recipientType: RecipientType;

  @ValidateIf((o) => o.recipientType === RecipientType.GROUP)
  @IsUUID('4', { message: 'Group ID must be a valid UUID' })
  groupId?: string;

  @ValidateIf((o) => o.recipientType === RecipientType.CUSTOMERS)
  @IsArray({ message: 'Customer IDs must be an array' })
  @ArrayMinSize(1, { message: 'At least one customer ID is required' })
  @ArrayMaxSize(10000, { message: 'Cannot send to more than 10,000 customers at once' })
  @IsUUID('4', { each: true, message: 'Each customer ID must be a valid UUID' })
  customerIds?: string[];

  @ValidateNested()
  @Type(() => TemplateVariablesConfigDto)
  templateVariables: TemplateVariablesConfigDto;

  @IsBoolean({ message: 'isImmediate must be a boolean' })
  isImmediate: boolean;

  @ValidateIf((o) => !o.isImmediate)
  @Type(() => Date)
  @IsDate({ message: 'Scheduled time must be a valid date' })
  @IsFutureDate({ message: 'Scheduled time must be in the future' })
  scheduledAt?: Date;

  @ValidateIf((o) => !o.isImmediate)
  @IsString({ message: 'Timezone is required for scheduled broadcasts' })
  timezone?: string;

  @IsOptional()
  @IsValidCustomFields({
    message: 'customFields must be an object with max 10KB, max 3 levels of nesting, max 50 keys, and only primitive values',
  })
  customFields?: Record<string, unknown>;
}
