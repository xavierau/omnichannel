import {
  IsArray,
  IsUUID,
  IsIn,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class BulkTagsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one customer ID is required' })
  @ArrayMaxSize(100, { message: 'Cannot update more than 100 customers at once' })
  @IsUUID('4', { each: true, message: 'Each customer ID must be a valid UUID' })
  customerIds: string[];

  @IsArray()
  @IsUUID('4', { each: true, message: 'Each tag ID must be a valid UUID' })
  tagIds: string[];

  @IsIn(['add', 'remove', 'replace'], {
    message: 'Action must be one of: add, remove, replace',
  })
  action: 'add' | 'remove' | 'replace';
}
