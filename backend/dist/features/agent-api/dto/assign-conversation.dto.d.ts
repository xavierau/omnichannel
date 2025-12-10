/**
 * DTO for assigning a conversation to an operator via Agent API.
 *
 * The target operator must:
 * - Exist in the same tenant
 * - Have access to the conversation's channel account
 */
export declare class AgentAssignConversationDto {
    operatorId: string;
}
