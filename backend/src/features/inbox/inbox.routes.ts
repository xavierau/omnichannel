import { Router, Request, Response } from 'express';
import { container } from 'tsyringe';
import { InboxController } from './inbox.controller';
import { InboxSseService } from './services/inbox-sse.service';
import { csrfValidateToken } from '@middleware/csrf-protection';
import { authenticate } from '@middleware/authenticate';
import { requirePermission } from '@middleware/authorize';
import { validateDto, validateQueryDto } from '@middleware/validate-dto';
import { requireTenant } from '@middleware/require-tenant';
import { validateUuid } from '@middleware/validate-uuid';
import { asyncHandler } from '@middleware/async-handler';
import { User } from '../users/user.entity';
import {
  ConversationQueryDto,
  SendMessageDto,
  CreateNoteDto,
  UpdateNoteDto,
  AssignConversationDto,
  UpdateStatusDto,
  MessageQueryDto,
} from './dto';

const router = Router();
const controller = container.resolve(InboxController);

// All routes require authentication and tenant
router.use(authenticate);
router.use(requireTenant);

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
router.get(
  '/stream',
  requirePermission('inbox', 'read', 'own'),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const user = req.user as User;

    const sseService = container.resolve(InboxSseService);

    // Add SSE client with connection limits
    const connected = sseService.addClient(tenantId, user.id, res);

    // If connection was rejected due to limits, response has already been sent
    if (!connected) {
      return;
    }

    // Connection remains open until client disconnects
    // The SSE service handles heartbeats and cleanup
  })
);

// ============================================================================
// Operator Routes
// ============================================================================

/**
 * GET /inbox/operators
 * List operators (users) available for conversation assignment.
 * Returns users who belong to active teams within the tenant.
 * Requires: inbox:read:own permission
 */
router.get(
  '/operators',
  requirePermission('inbox', 'read', 'own'),
  controller.listOperators
);

// ============================================================================
// Conversation Routes
// ============================================================================

/**
 * GET /inbox/conversations
 * List conversations accessible to the current user.
 * Requires: inbox:read:own permission
 */
router.get(
  '/conversations',
  requirePermission('inbox', 'read', 'own'),
  validateQueryDto(ConversationQueryDto),
  controller.listConversations
);

/**
 * GET /inbox/conversations/:id
 * Get a specific conversation by ID.
 * Requires: inbox:read:own permission
 */
router.get(
  '/conversations/:id',
  requirePermission('inbox', 'read', 'own'),
  validateUuid(),
  controller.getConversation
);

// ============================================================================
// Message Routes
// ============================================================================

/**
 * GET /inbox/conversations/:id/messages
 * Get paginated messages for a conversation.
 * Requires: inbox:read:own permission
 */
router.get(
  '/conversations/:id/messages',
  requirePermission('inbox', 'read', 'own'),
  validateUuid(),
  validateQueryDto(MessageQueryDto),
  controller.getMessages
);

/**
 * POST /inbox/conversations/:id/messages
 * Send a new message in a conversation.
 * Requires: inbox:message:own permission
 */
router.post(
  '/conversations/:id/messages',
  csrfValidateToken,
  requirePermission('inbox', 'message', 'own'),
  validateUuid(),
  validateDto(SendMessageDto),
  controller.sendMessage
);

// ============================================================================
// Assignment Routes
// ============================================================================

/**
 * POST /inbox/conversations/:id/pickup
 * Pick up an unassigned conversation.
 * Requires: inbox:assign:own permission
 */
router.post(
  '/conversations/:id/pickup',
  csrfValidateToken,
  requirePermission('inbox', 'assign', 'own'),
  validateUuid(),
  controller.pickupConversation
);

/**
 * POST /inbox/conversations/:id/release
 * Release a conversation back to the unassigned pool.
 * Requires: inbox:assign:own permission
 */
router.post(
  '/conversations/:id/release',
  csrfValidateToken,
  requirePermission('inbox', 'assign', 'own'),
  validateUuid(),
  controller.releaseConversation
);

/**
 * POST /inbox/conversations/:id/assign
 * Assign a conversation to another user.
 * Requires: inbox:assign:all permission
 */
router.post(
  '/conversations/:id/assign',
  csrfValidateToken,
  requirePermission('inbox', 'assign', 'all'),
  validateUuid(),
  validateDto(AssignConversationDto),
  controller.assignConversation
);

// ============================================================================
// Status Management Routes
// ============================================================================

/**
 * PATCH /inbox/conversations/:id/status
 * Update the status of a conversation.
 * Requires: inbox:update:own permission
 */
router.patch(
  '/conversations/:id/status',
  csrfValidateToken,
  requirePermission('inbox', 'update', 'own'),
  validateUuid(),
  validateDto(UpdateStatusDto),
  controller.updateStatus
);

/**
 * PATCH /inbox/conversations/:id/mark-read
 * Mark a conversation as read.
 * Requires: inbox:update:own permission
 */
router.patch(
  '/conversations/:id/mark-read',
  csrfValidateToken,
  requirePermission('inbox', 'update', 'own'),
  validateUuid(),
  controller.markAsRead
);

// ============================================================================
// Note Routes
// ============================================================================

/**
 * GET /inbox/conversations/:id/notes
 * Get all notes for a conversation.
 * Requires: inbox:note:own permission
 */
router.get(
  '/conversations/:id/notes',
  requirePermission('inbox', 'note', 'own'),
  validateUuid(),
  controller.getNotes
);

/**
 * POST /inbox/conversations/:id/notes
 * Create a new note on a conversation.
 * Requires: inbox:note:own permission
 */
router.post(
  '/conversations/:id/notes',
  csrfValidateToken,
  requirePermission('inbox', 'note', 'own'),
  validateUuid(),
  validateDto(CreateNoteDto),
  controller.createNote
);

/**
 * PATCH /inbox/notes/:id
 * Update an existing note.
 * Requires: inbox:note:own permission
 */
router.patch(
  '/notes/:id',
  csrfValidateToken,
  requirePermission('inbox', 'note', 'own'),
  validateUuid(),
  validateDto(UpdateNoteDto),
  controller.updateNote
);

/**
 * DELETE /inbox/notes/:id
 * Delete a note.
 * Requires: inbox:note:own permission
 */
router.delete(
  '/notes/:id',
  csrfValidateToken,
  requirePermission('inbox', 'note', 'own'),
  validateUuid(),
  controller.deleteNote
);

export default router;
