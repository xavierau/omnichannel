import {
  IsEnum,
  IsString,
  MaxLength,
  IsUrl,
  Matches,
  ValidateIf,
} from 'class-validator';
import { ButtonType } from '../enums';

/**
 * DTO for template button validation.
 * Buttons are used in WhatsApp template messages for quick actions.
 */
export class TemplateButtonDto {
  @IsEnum(ButtonType, { message: 'Button type must be a valid ButtonType' })
  type: ButtonType;

  @IsString()
  @MaxLength(25, { message: 'Button text must not exceed 25 characters' })
  text: string;

  @ValidateIf((o) => o.type === ButtonType.URL)
  @IsUrl({}, { message: 'URL must be a valid URL' })
  @MaxLength(2000, { message: 'URL must not exceed 2000 characters' })
  url?: string;

  @ValidateIf((o) => o.type === ButtonType.CALL)
  @IsString()
  @Matches(/^\+?\d{10,15}$/, {
    message: 'Phone number must be 10-15 digits, optionally prefixed with +',
  })
  phoneNumber?: string;
}
