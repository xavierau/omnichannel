import {
  IsString,
  IsArray,
  IsOptional,
  IsInt,
  IsIn,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ConversationStatus } from '../enums';

/**
 * DTO for conversation list query parameters.
 * Supports filtering by status, searching, pagination, and sorting.
 */
export class ConversationQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').filter((v) => v.trim());
    }
    return value;
  })
  @IsArray()
  @IsEnum(ConversationStatus, { each: true, message: 'Invalid conversation status' })
  status?: ConversationStatus[];

  @IsOptional()
  @IsString()
  search?: string;

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
  limit?: number = 20;

  @IsOptional()
  @IsString()
  @IsIn(['lastMessageAt', 'createdAt', 'unreadCount'], {
    message: 'sortBy must be one of: lastMessageAt, createdAt, unreadCount',
  })
  sortBy?: 'lastMessageAt' | 'createdAt' | 'unreadCount' = 'lastMessageAt';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc', 'ASC', 'DESC'], {
    message: 'sortOrder must be one of: asc, desc',
  })
  sortOrder?: 'asc' | 'desc' | 'ASC' | 'DESC' = 'desc';
}
