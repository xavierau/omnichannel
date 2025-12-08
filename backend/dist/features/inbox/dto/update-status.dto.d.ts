import { ConversationStatus } from '../enums';
/**
 * DTO for updating a conversation's status.
 *
 * Status transitions are validated by the service layer according to
 * the conversation state machine.
 *
 * Valid transitions:
 * - UNASSIGNED -> ACTIVE, WAITING, RESOLVED, CLOSED
 * - ACTIVE -> WAITING, RESOLVED, CLOSED, UNASSIGNED
 * - WAITING -> ACTIVE, RESOLVED, CLOSED
 * - RESOLVED -> ACTIVE, CLOSED
 * - CLOSED -> ACTIVE
 */
export declare class UpdateStatusDto {
    status: ConversationStatus;
}
