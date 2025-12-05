import {
  IsString,
  IsArray,
  IsOptional,
  IsInt,
  IsDateString,
  IsIn,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { BroadcastStatus } from '../enums';
import { TemplateCategory } from '../../templates/enums';

/**
 * DTO for broadcast list query parameters.
 * Supports filtering, searching, pagination, and sorting.
 */
export class BroadcastQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => {
    // Handle comma-separated string or array
    if (typeof value === 'string') {
      return value.split(',').filter((v) => v.trim());
    }
    return value;
  })
  @IsArray()
  @IsEnum(BroadcastStatus, { each: true, message: 'Invalid broadcast status' })
  statuses?: BroadcastStatus[];

  @IsOptional()
  @Transform(({ value }) => {
    // Handle comma-separated string or array
    if (typeof value === 'string') {
      return value.split(',').filter((v) => v.trim());
    }
    return value;
  })
  @IsArray()
  @IsEnum(TemplateCategory, { each: true, message: 'Invalid template category' })
  templateCategories?: TemplateCategory[];

  @IsOptional()
  @IsDateString({}, { message: 'dateFrom must be a valid ISO date string' })
  dateFrom?: string;

  @IsOptional()
  @IsDateString({}, { message: 'dateTo must be a valid ISO date string' })
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must not exceed 100' })
  limit?: number = 10;

  @IsOptional()
  @IsString()
  @IsIn(['name', 'createdAt', 'scheduledAt', 'status', 'updatedAt'], {
    message: 'sortBy must be one of: name, createdAt, scheduledAt, status, updatedAt',
  })
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc', 'ASC', 'DESC'], {
    message: 'sortOrder must be one of: asc, desc',
  })
  sortOrder?: 'asc' | 'desc' | 'ASC' | 'DESC' = 'desc';
}
