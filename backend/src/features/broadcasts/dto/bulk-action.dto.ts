import { IsArray, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';

/**
 * DTO for bulk operations on broadcasts.
 * Used for bulk delete and bulk status update operations.
 */
export class BulkActionDto {
  @IsArray({ message: 'IDs must be an array' })
  @ArrayMinSize(1, { message: 'At least one ID is required' })
  @ArrayMaxSize(100, { message: 'Cannot perform bulk operation on more than 100 broadcasts at once' })
  @IsUUID('4', { each: true, message: 'Each ID must be a valid UUID' })
  ids: string[];
}
