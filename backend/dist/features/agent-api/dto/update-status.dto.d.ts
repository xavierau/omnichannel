import { ConversationStatus } from '../../inbox/enums';
/**
 * DTO for updating a conversation's status via Agent API.
 *
 * Status transitions are validated by the ConversationService according to
 * the conversation state machine.
 *
 * Valid transitions:
 * - UNASSIGNED -> ACTIVE, WAITING, RESOLVED, CLOSED
 * - ACTIVE -> WAITING, RESOLVED, CLOSED, UNASSIGNED
 * - WAITING -> ACTIVE, RESOLVED, CLOSED
 * - RESOLVED -> ACTIVE, CLOSED
 * - CLOSED -> ACTIVE
 */
export declare class AgentUpdateStatusDto {
    status: ConversationStatus;
}
