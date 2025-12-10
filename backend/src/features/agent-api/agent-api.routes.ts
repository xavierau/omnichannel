import { Router } from 'express';
import { container } from 'tsyringe';
import { AgentApiController } from './controllers/agent-api.controller';
import { apiKeyAuth, requireApiKeyPermission } from '@middleware/api-key-auth.middleware';
import { agentApiLimiter } from '@middleware/rate-limiter';
import { validateDto, validateQueryDto } from '@middleware/validate-dto';
import { validateUuid } from '@middleware/validate-uuid';
import { ApiKeyPermission } from '@features/api-keys/enums/api-key-permission.enum';
import {
  AgentUpdateStatusDto,
  AgentAssignConversationDto,
  AgentSendMessageDto,
  AgentGetMessagesQueryDto,
} from './dto';

const router = Router();

/**
 * Agent API Routes
 *
 * These routes are used by AI agents to interact with conversations.
 * Authentication is via API keys, not JWT tokens.
 *
 * All routes require:
 * - Valid API key in Authorization header (Bearer <key>) or X-API-Key header
 * - Specific permission for the operation
 *
 * If the API key is scoped to a channel account, operations are
 * restricted to conversations in that channel account.
 *
 * Security:
 * - Rate limiting: 100 requests per minute per API key
 * - Rate limiting is applied BEFORE authentication to prevent brute force attacks
 */

// Apply rate limiting BEFORE authentication to prevent brute force attacks
router.use(agentApiLimiter);

// Apply API key authentication to all routes
router.use(apiKeyAuth);

// Resolve controller instance
const getController = () => container.resolve(AgentApiController);

// ============================================================================
// Operator Routes
// ============================================================================

/**
 * GET /agent/operators
 * List operators (users) available for conversation assignment.
 *
 * Required permission: conversation:read
 *
 * Returns users who belong to active teams within the tenant.
 * Useful for implementing dynamic assignment logic in automation workflows.
 *
 * Returns:
 * - 200: Array of operator objects with id, firstName, lastName, email, isActive
 * - 401: Invalid or missing API key
 * - 403: API key lacks permission
 */
router.get(
  '/operators',
  requireApiKeyPermission(ApiKeyPermission.CONVERSATION_READ),
  (req, res, next) => getController().getOperators(req, res, next)
);

// ============================================================================
// Conversation Routes
// ============================================================================

/**
 * GET /agent/conversations/:id
 * Get a specific conversation by ID.
 *
 * Required permission: conversation:read
 *
 * Returns:
 * - 200: Conversation object with customer info
 * - 401: Invalid or missing API key
 * - 403: API key lacks permission or channel account access
 * - 404: Conversation not found
 */
router.get(
  '/conversations/:id',
  requireApiKeyPermission(ApiKeyPermission.CONVERSATION_READ),
  validateUuid(),
  (req, res, next) => getController().getConversation(req, res, next)
);

/**
 * GET /agent/conversations/:id/messages
 * Get paginated messages for a conversation.
 *
 * Required permission: conversation:read
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Messages per page (default: 50, max: 100)
 *
 * Returns:
 * - 200: Array of messages with pagination metadata
 * - 401: Invalid or missing API key
 * - 403: API key lacks permission or channel account access
 * - 404: Conversation not found
 */
router.get(
  '/conversations/:id/messages',
  requireApiKeyPermission(ApiKeyPermission.CONVERSATION_READ),
  validateUuid(),
  validateQueryDto(AgentGetMessagesQueryDto),
  (req, res, next) => getController().getMessages(req, res, next)
);

/**
 * PATCH /agent/conversations/:id/status
 * Update the status of a conversation.
 *
 * Required permission: conversation:update_status
 *
 * Request body:
 * {
 *   "status": "active" | "waiting" | "resolved" | "closed" | "unassigned"
 * }
 *
 * Returns:
 * - 200: Updated conversation object
 * - 400: Invalid status or invalid transition
 * - 401: Invalid or missing API key
 * - 403: API key lacks permission or channel account access
 * - 404: Conversation not found
 */
router.patch(
  '/conversations/:id/status',
  requireApiKeyPermission(ApiKeyPermission.CONVERSATION_UPDATE_STATUS),
  validateUuid(),
  validateDto(AgentUpdateStatusDto),
  (req, res, next) => getController().updateStatus(req, res, next)
);

/**
 * POST /agent/conversations/:id/assign
 * Assign a conversation to an operator.
 *
 * Required permission: conversation:assign
 *
 * Request body:
 * {
 *   "operatorId": "uuid"
 * }
 *
 * Returns:
 * - 200: Updated conversation object
 * - 400: Invalid operator ID or operator not found
 * - 401: Invalid or missing API key
 * - 403: API key lacks permission or channel account access
 * - 404: Conversation not found
 */
router.post(
  '/conversations/:id/assign',
  requireApiKeyPermission(ApiKeyPermission.CONVERSATION_ASSIGN),
  validateUuid(),
  validateDto(AgentAssignConversationDto),
  (req, res, next) => getController().assignConversation(req, res, next)
);

/**
 * POST /agent/conversations/:id/messages
 * Send a new message in a conversation.
 *
 * Required permission: message:send
 *
 * Request body for text message:
 * {
 *   "contentType": "text",
 *   "text": { "content": "Hello" }
 * }
 *
 * Request body for media message:
 * {
 *   "contentType": "image" | "document" | "audio",
 *   "media": { "url": "https://...", "caption": "Optional" }
 * }
 *
 * Request body for template message:
 * {
 *   "contentType": "template",
 *   "template": {
 *     "name": "template_name",
 *     "language": "en_US",
 *     "variables": { "body": { "1": "value" } }
 *   }
 * }
 *
 * Returns:
 * - 201: Created message object
 * - 400: Invalid content or missing required fields
 * - 401: Invalid or missing API key
 * - 403: API key lacks permission or channel account access
 * - 404: Conversation not found
 */
router.post(
  '/conversations/:id/messages',
  requireApiKeyPermission(ApiKeyPermission.MESSAGE_SEND),
  validateUuid(),
  validateDto(AgentSendMessageDto),
  (req, res, next) => getController().sendMessage(req, res, next)
);

export default router;
