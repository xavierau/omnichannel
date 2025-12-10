/**
 * Permissions that can be granted to API keys.
 * These control what actions AI agents can perform via the API.
 */
export enum ApiKeyPermission {
  CONVERSATION_READ = 'conversation:read',
  CONVERSATION_UPDATE_STATUS = 'conversation:update_status',
  CONVERSATION_ASSIGN = 'conversation:assign',
  MESSAGE_SEND = 'message:send',
}
