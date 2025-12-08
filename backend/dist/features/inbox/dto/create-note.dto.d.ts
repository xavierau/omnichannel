import { NoteScope } from '../enums';
/**
 * DTO for creating a new note on a conversation.
 *
 * Notes are internal-only content visible to operators but not customers.
 * They support:
 * - Scoped visibility (conversation-specific vs customer-wide)
 * - @mentions for team collaboration
 */
export declare class CreateNoteDto {
    content: string;
    scope?: NoteScope;
    mentions?: string[];
}
