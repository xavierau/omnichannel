import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * DTO for updating an existing note.
 *
 * Only content and mentions can be updated.
 * Scope cannot be changed after creation.
 */
export class UpdateNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'Note content must not exceed 5000 characters' })
  content?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Each mention must be a valid user UUID' })
  mentions?: string[];
}
