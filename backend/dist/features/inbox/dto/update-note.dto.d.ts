/**
 * DTO for updating an existing note.
 *
 * Only content and mentions can be updated.
 * Scope cannot be changed after creation.
 */
export declare class UpdateNoteDto {
    content?: string;
    mentions?: string[];
}
