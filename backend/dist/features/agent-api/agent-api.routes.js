"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tsyringe_1 = require("tsyringe");
const agent_api_controller_1 = require("./controllers/agent-api.controller");
const api_key_auth_middleware_1 = require("../../middleware/api-key-auth.middleware");
const rate_limiter_1 = require("../../middleware/rate-limiter");
const validate_dto_1 = require("../../middleware/validate-dto");
const validate_uuid_1 = require("../../middleware/validate-uuid");
const api_key_permission_enum_1 = require("../api-keys/enums/api-key-permission.enum");
const dto_1 = require("./dto");
const router = (0, express_1.Router)();
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
router.use(rate_limiter_1.agentApiLimiter);
// Apply API key authentication to all routes
router.use(api_key_auth_middleware_1.apiKeyAuth);
// Resolve controller instance
const getController = () => tsyringe_1.container.resolve(agent_api_controller_1.AgentApiController);
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
router.get('/conversations/:id', (0, api_key_auth_middleware_1.requireApiKeyPermission)(api_key_permission_enum_1.ApiKeyPermission.CONVERSATION_READ), (0, validate_uuid_1.validateUuid)(), (req, res, next) => getController().getConversation(req, res, next));
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
router.patch('/conversations/:id/status', (0, api_key_auth_middleware_1.requireApiKeyPermission)(api_key_permission_enum_1.ApiKeyPermission.CONVERSATION_UPDATE_STATUS), (0, validate_uuid_1.validateUuid)(), (0, validate_dto_1.validateDto)(dto_1.AgentUpdateStatusDto), (req, res, next) => getController().updateStatus(req, res, next));
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
router.post('/conversations/:id/assign', (0, api_key_auth_middleware_1.requireApiKeyPermission)(api_key_permission_enum_1.ApiKeyPermission.CONVERSATION_ASSIGN), (0, validate_uuid_1.validateUuid)(), (0, validate_dto_1.validateDto)(dto_1.AgentAssignConversationDto), (req, res, next) => getController().assignConversation(req, res, next));
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
router.post('/conversations/:id/messages', (0, api_key_auth_middleware_1.requireApiKeyPermission)(api_key_permission_enum_1.ApiKeyPermission.MESSAGE_SEND), (0, validate_uuid_1.validateUuid)(), (0, validate_dto_1.validateDto)(dto_1.AgentSendMessageDto), (req, res, next) => getController().sendMessage(req, res, next));
exports.default = router;
