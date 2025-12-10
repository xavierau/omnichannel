/**
 * DTO for Agent API message list query parameters.
 * Supports pagination for retrieving conversation messages via API key auth.
 */
export declare class AgentGetMessagesQueryDto {
    page?: number;
    limit?: number;
}
