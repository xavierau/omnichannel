import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  IsIn,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { TemplateCategory, TemplateStatus } from '../enums';

/**
 * DTO for template list query parameters.
 * Supports filtering, pagination, and sorting.
 */
export class TemplateQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(TemplateCategory, { each: true, message: 'Each category must be a valid TemplateCategory' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return [value];
    }
    return value;
  })
  categories?: TemplateCategory[];

  @IsOptional()
  @IsArray()
  @IsEnum(TemplateStatus, { each: true, message: 'Each status must be a valid TemplateStatus' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return [value];
    }
    return value;
  })
  statuses?: TemplateStatus[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  @IsIn(['name', 'category', 'createdAt', 'updatedAt'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc', 'ASC', 'DESC'])
  sortOrder?: 'asc' | 'desc' | 'ASC' | 'DESC' = 'desc';
}
