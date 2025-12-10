import { IsUUID } from 'class-validator';

/**
 * DTO for assigning a conversation to an operator via Agent API.
 *
 * The target operator must:
 * - Exist in the same tenant
 * - Have access to the conversation's channel account
 */
export class AgentAssignConversationDto {
  @IsUUID('4', { message: 'operatorId must be a valid UUID' })
  operatorId: string;
}
