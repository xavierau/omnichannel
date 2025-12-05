import {
  IsString,
  IsInt,
  IsOptional,
  IsIn,
  ValidateIf,
  Min,
  ValidateNested,
  IsArray,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for configuring a single template variable.
 * Variables can be either static values or dynamically sourced from customer fields.
 */
export class VariableConfigDto {
  @IsInt({ message: 'Variable index must be a positive integer' })
  @Min(1, { message: 'Variable index must be at least 1' })
  index: number;

  @IsString()
  @IsIn(['static', 'customer_field'], {
    message: 'Source type must be either "static" or "customer_field"',
  })
  sourceType: 'static' | 'customer_field';

  @ValidateIf((o) => o.sourceType === 'static')
  @IsString({ message: 'Static value is required when source type is "static"' })
  staticValue?: string;

  @ValidateIf((o) => o.sourceType === 'customer_field')
  @IsString({ message: 'Customer field is required when source type is "customer_field"' })
  customerField?: string;
}

/**
 * DTO for configuring header content in templates.
 * Supports text headers with variables or media headers with URLs.
 */
export class HeaderConfigDto {
  @IsString()
  @IsIn(['text', 'image', 'video', 'document'], {
    message: 'Header type must be one of: text, image, video, document',
  })
  type: 'text' | 'image' | 'video' | 'document';

  @ValidateIf((o) => o.type === 'text')
  @IsOptional()
  @ValidateNested()
  @Type(() => VariableConfigDto)
  textVariable?: VariableConfigDto;

  @ValidateIf((o) => o.type !== 'text')
  @IsOptional()
  @IsUrl(
    { protocols: ['https'], require_protocol: true },
    { message: 'Media URL must be a valid HTTPS URL' }
  )
  mediaUrl?: string;
}

/**
 * DTO for configuring button variables in templates.
 * Maps variables to specific buttons by index.
 */
export class ButtonVariableConfigDto {
  @IsInt({ message: 'Button index must be a non-negative integer' })
  @Min(0, { message: 'Button index must be at least 0' })
  buttonIndex: number;

  @ValidateNested()
  @Type(() => VariableConfigDto)
  variable: VariableConfigDto;
}

/**
 * DTO for the complete template variables configuration.
 * Contains all variable mappings for header, body, and buttons.
 */
export class TemplateVariablesConfigDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => HeaderConfigDto)
  header?: HeaderConfigDto;

  @IsArray({ message: 'Body variables must be an array' })
  @ValidateNested({ each: true })
  @Type(() => VariableConfigDto)
  bodyVariables: VariableConfigDto[];

  @IsOptional()
  @IsArray({ message: 'Button variables must be an array' })
  @ValidateNested({ each: true })
  @Type(() => ButtonVariableConfigDto)
  buttonVariables?: ButtonVariableConfigDto[];
}
