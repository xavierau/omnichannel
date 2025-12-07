import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { NoteScope } from '../enums';

/**
 * DTO for creating a new note on a conversation.
 *
 * Notes are internal-only content visible to operators but not customers.
 * They support:
 * - Scoped visibility (conversation-specific vs customer-wide)
 * - @mentions for team collaboration
 */
export class CreateNoteDto {
  @IsString()
  @MaxLength(5000, { message: 'Note content must not exceed 5000 characters' })
  content: string;

  @IsOptional()
  @IsEnum(NoteScope, { message: 'scope must be either "conversation" or "customer"' })
  scope?: NoteScope = NoteScope.CONVERSATION;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Each mention must be a valid user UUID' })
  mentions?: string[];
}
