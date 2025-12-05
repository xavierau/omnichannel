import {
  IsString,
  IsArray,
  IsUUID,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { IsValidCustomFields } from './custom-fields.validator';

export class CreateCustomerDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(255, { message: 'Name must not exceed 255 characters' })
  name: string;

  @IsString()
  @Matches(/^\d{10,15}$/, {
    message: 'WhatsApp number must be 10-15 digits (numbers only)',
  })
  whatsappNumber: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Each tag ID must be a valid UUID' })
  tagIds?: string[];

  @IsOptional()
  @IsValidCustomFields({
    message:
      'customFields must be an object with max 10KB size, max 3 levels of nesting, max 50 keys, and only primitive values (string, number, boolean, null)',
  })
  customFields?: Record<string, unknown>;
}
