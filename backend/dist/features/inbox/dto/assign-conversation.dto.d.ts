/**
 * DTO for assigning a conversation to a user.
 *
 * Used when transferring a conversation from one operator to another.
 * The target user must have access to the conversation's channel account.
 */
export declare class AssignConversationDto {
    userId: string;
}
