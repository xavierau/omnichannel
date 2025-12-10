import { IsEnum } from 'class-validator';
import { ConversationStatus } from '@features/inbox/enums';

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
export class AgentUpdateStatusDto {
  @IsEnum(ConversationStatus, {
    message: 'status must be one of: unassigned, active, waiting, resolved, closed',
  })
  status: ConversationStatus;
}
