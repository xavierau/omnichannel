"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tsyringe_1 = require("tsyringe");
const inbox_controller_1 = require("./inbox.controller");
const inbox_sse_service_1 = require("./services/inbox-sse.service");
const csrf_protection_1 = require("@middleware/csrf-protection");
const authenticate_1 = require("@middleware/authenticate");
const authorize_1 = require("@middleware/authorize");
const validate_dto_1 = require("@middleware/validate-dto");
const require_tenant_1 = require("@middleware/require-tenant");
const validate_uuid_1 = require("@middleware/validate-uuid");
const async_handler_1 = require("@middleware/async-handler");
const dto_1 = require("./dto");
const router = (0, express_1.Router)();
const controller = tsyringe_1.container.resolve(inbox_controller_1.InboxController);
// All routes require authentication and tenant
router.use(authenticate_1.authenticate);
router.use(require_tenant_1.requireTenant);
// ============================================================================
// SSE Stream Route
// ============================================================================
/**
 * GET /inbox/stream
 * Server-Sent Events endpoint for real-time inbox updates.
 *
 * Provides real-time notifications for:
 * - New conversations (conversation:new)
 * - New messages (conversation:message:new)
 * - Message status updates (conversation:message:status)
 * - Assignment changes (conversation:assigned)
 * - Conversation status changes (conversation:status:changed)
 * - Unread count updates (conversation:unread:updated)
 * - Note CRUD operations (note:created, note:updated, note:deleted)
 *
 * Connection limits:
 * - Max 100 connections per tenant
 * - Max 5 connections per user
 *
 * Requires: inbox:read:own permission
 */
router.get('/stream', (0, authorize_1.requirePermission)('inbox', 'read', 'own'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const user = req.user;
    const sseService = tsyringe_1.container.resolve(inbox_sse_service_1.InboxSseService);
    // Add SSE client with connection limits
    const connected = sseService.addClient(tenantId, user.id, res);
    // If connection was rejected due to limits, response has already been sent
    if (!connected) {
        return;
    }
    // Connection remains open until client disconnects
    // The SSE service handles heartbeats and cleanup
}));
// ============================================================================
// Operator Routes
// ============================================================================
/**
 * GET /inbox/operators
 * List operators (users) available for conversation assignment.
 * Returns users who belong to active teams within the tenant.
 * Requires: inbox:read:own permission
 */
router.get('/operators', (0, authorize_1.requirePermission)('inbox', 'read', 'own'), controller.listOperators);
// ============================================================================
// Conversation Routes
// ============================================================================
/**
 * GET /inbox/conversations
 * List conversations accessible to the current user.
 * Requires: inbox:read:own permission
 */
router.get('/conversations', (0, authorize_1.requirePermission)('inbox', 'read', 'own'), (0, validate_dto_1.validateQueryDto)(dto_1.ConversationQueryDto), controller.listConversations);
/**
 * GET /inbox/conversations/:id
 * Get a specific conversation by ID.
 * Requires: inbox:read:own permission
 */
router.get('/conversations/:id', (0, authorize_1.requirePermission)('inbox', 'read', 'own'), (0, validate_uuid_1.validateUuid)(), controller.getConversation);
// ============================================================================
// Message Routes
// ============================================================================
/**
 * GET /inbox/conversations/:id/messages
 * Get paginated messages for a conversation.
 * Requires: inbox:read:own permission
 */
router.get('/conversations/:id/messages', (0, authorize_1.requirePermission)('inbox', 'read', 'own'), (0, validate_uuid_1.validateUuid)(), (0, validate_dto_1.validateQueryDto)(dto_1.MessageQueryDto), controller.getMessages);
/**
 * POST /inbox/conversations/:id/messages
 * Send a new message in a conversation.
 * Requires: inbox:message:own permission
 */
router.post('/conversations/:id/messages', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('inbox', 'message', 'own'), (0, validate_uuid_1.validateUuid)(), (0, validate_dto_1.validateDto)(dto_1.SendMessageDto), controller.sendMessage);
// ============================================================================
// Assignment Routes
// ============================================================================
/**
 * POST /inbox/conversations/:id/pickup
 * Pick up an unassigned conversation.
 * Requires: inbox:assign:own permission
 */
router.post('/conversations/:id/pickup', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('inbox', 'assign', 'own'), (0, validate_uuid_1.validateUuid)(), controller.pickupConversation);
/**
 * POST /inbox/conversations/:id/release
 * Release a conversation back to the unassigned pool.
 * Requires: inbox:assign:own permission
 */
router.post('/conversations/:id/release', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('inbox', 'assign', 'own'), (0, validate_uuid_1.validateUuid)(), controller.releaseConversation);
/**
 * POST /inbox/conversations/:id/assign
 * Assign a conversation to another user.
 * Requires: inbox:assign:all permission
 */
router.post('/conversations/:id/assign', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('inbox', 'assign', 'all'), (0, validate_uuid_1.validateUuid)(), (0, validate_dto_1.validateDto)(dto_1.AssignConversationDto), controller.assignConversation);
// ============================================================================
// Status Management Routes
// ============================================================================
/**
 * PATCH /inbox/conversations/:id/status
 * Update the status of a conversation.
 * Requires: inbox:update:own permission
 */
router.patch('/conversations/:id/status', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('inbox', 'update', 'own'), (0, validate_uuid_1.validateUuid)(), (0, validate_dto_1.validateDto)(dto_1.UpdateStatusDto), controller.updateStatus);
/**
 * PATCH /inbox/conversations/:id/mark-read
 * Mark a conversation as read.
 * Requires: inbox:update:own permission
 */
router.patch('/conversations/:id/mark-read', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('inbox', 'update', 'own'), (0, validate_uuid_1.validateUuid)(), controller.markAsRead);
// ============================================================================
// Note Routes
// ============================================================================
/**
 * GET /inbox/conversations/:id/notes
 * Get all notes for a conversation.
 * Requires: inbox:note:own permission
 */
router.get('/conversations/:id/notes', (0, authorize_1.requirePermission)('inbox', 'note', 'own'), (0, validate_uuid_1.validateUuid)(), controller.getNotes);
/**
 * POST /inbox/conversations/:id/notes
 * Create a new note on a conversation.
 * Requires: inbox:note:own permission
 */
router.post('/conversations/:id/notes', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('inbox', 'note', 'own'), (0, validate_uuid_1.validateUuid)(), (0, validate_dto_1.validateDto)(dto_1.CreateNoteDto), controller.createNote);
/**
 * PATCH /inbox/notes/:id
 * Update an existing note.
 * Requires: inbox:note:own permission
 */
router.patch('/notes/:id', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('inbox', 'note', 'own'), (0, validate_uuid_1.validateUuid)(), (0, validate_dto_1.validateDto)(dto_1.UpdateNoteDto), controller.updateNote);
/**
 * DELETE /inbox/notes/:id
 * Delete a note.
 * Requires: inbox:note:own permission
 */
router.delete('/notes/:id', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('inbox', 'note', 'own'), (0, validate_uuid_1.validateUuid)(), controller.deleteNote);
exports.default = router;
