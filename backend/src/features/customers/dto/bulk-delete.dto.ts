import { IsArray, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class BulkDeleteDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one ID is required' })
  @ArrayMaxSize(100, { message: 'Cannot delete more than 100 customers at once' })
  @IsUUID('4', { each: true, message: 'Each ID must be a valid UUID' })
  ids: string[];
}
