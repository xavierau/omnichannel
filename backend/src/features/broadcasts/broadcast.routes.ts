import { Router } from 'express';
import { container } from 'tsyringe';
import { BroadcastController } from './broadcast.controller';
import { csrfValidateToken } from '@middleware/csrf-protection';
import { authenticate } from '@middleware/authenticate';
import { requirePermission } from '@middleware/authorize';
import { validateDto, validateQueryDto } from '@middleware/validate-dto';
import { requireTenant } from '@middleware/require-tenant';
import { validateUuid } from '@middleware/validate-uuid';
import { broadcastActionLimiter, broadcastBulkLimiter } from '@middleware/rate-limiter';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';
import { UpdateBroadcastDto } from './dto/update-broadcast.dto';
import { BroadcastQueryDto } from './dto/broadcast-query.dto';
import { BulkActionDto } from './dto/bulk-action.dto';

const router = Router();
const controller = container.resolve(BroadcastController);

// All routes require authentication and tenant
router.use(authenticate);
router.use(requireTenant);

/**
 * GET /broadcasts
 * List all broadcasts with pagination, search, and filters.
 * Requires: broadcasts:read:all or broadcasts:read:own permission
 */
router.get(
  '/',
  requirePermission('broadcasts', 'read', 'own'),
  validateQueryDto(BroadcastQueryDto),
  controller.listBroadcasts
);

/**
 * DELETE /broadcasts/bulk
 * Bulk delete broadcasts (must be before /:id route).
 * Requires: broadcasts:delete:all permission
 */
router.delete(
  '/bulk',
  broadcastBulkLimiter,
  csrfValidateToken,
  requirePermission('broadcasts', 'delete', 'all'),
  validateDto(BulkActionDto),
  controller.bulkDelete
);

/**
 * POST /broadcasts/bulk-pause
 * Bulk pause multiple broadcasts.
 * Requires: broadcasts:update:all permission
 */
router.post(
  '/bulk-pause',
  broadcastBulkLimiter,
  csrfValidateToken,
  requirePermission('broadcasts', 'update', 'all'),
  validateDto(BulkActionDto),
  controller.bulkPause
);

/**
 * POST /broadcasts/bulk-cancel
 * Bulk cancel multiple broadcasts.
 * Requires: broadcasts:update:all permission
 */
router.post(
  '/bulk-cancel',
  broadcastBulkLimiter,
  csrfValidateToken,
  requirePermission('broadcasts', 'update', 'all'),
  validateDto(BulkActionDto),
  controller.bulkCancel
);

/**
 * GET /broadcasts/export/csv
 * Export broadcasts to CSV format.
 * Supports the same query filters as listBroadcasts.
 * Requires: broadcasts:read:all permission (full export access)
 */
router.get(
  '/export/csv',
  requirePermission('broadcasts', 'read', 'all'),
  validateQueryDto(BroadcastQueryDto),
  controller.exportToCsv
);

/**
 * GET /broadcasts/export/excel
 * Export broadcasts to Excel format.
 * Supports the same query filters as listBroadcasts.
 * Requires: broadcasts:read:all permission (full export access)
 */
router.get(
  '/export/excel',
  requirePermission('broadcasts', 'read', 'all'),
  validateQueryDto(BroadcastQueryDto),
  controller.exportToExcel
);

/**
 * GET /broadcasts/:id
 * Get a specific broadcast by ID.
 * Requires: broadcasts:read:all or broadcasts:read:own permission
 */
router.get(
  '/:id',
  requirePermission('broadcasts', 'read', 'own'),
  validateUuid(),
  controller.getBroadcast
);

/**
 * GET /broadcasts/:id/report
 * Get broadcast report with detailed metrics.
 * Requires: broadcasts:read:all or broadcasts:read:own permission
 */
router.get(
  '/:id/report',
  requirePermission('broadcasts', 'read', 'own'),
  validateUuid(),
  controller.getBroadcastReport
);

/**
 * GET /broadcasts/:id/progress/stream
 * Server-Sent Events for real-time broadcast progress.
 * Requires: broadcasts:read:all or broadcasts:read:own permission
 */
router.get(
  '/:id/progress/stream',
  requirePermission('broadcasts', 'read', 'own'),
  validateUuid(),
  controller.streamProgress
);

/**
 * POST /broadcasts
 * Create a new broadcast.
 * Requires: broadcasts:create:all or broadcasts:create:own permission
 */
router.post(
  '/',
  csrfValidateToken,
  requirePermission('broadcasts', 'create', 'own'),
  validateDto(CreateBroadcastDto),
  controller.createBroadcast
);

/**
 * POST /broadcasts/:id/schedule
 * Schedule a draft broadcast.
 * Requires: broadcasts:update:all or broadcasts:update:own permission
 */
router.post(
  '/:id/schedule',
  broadcastActionLimiter,
  csrfValidateToken,
  requirePermission('broadcasts', 'update', 'own'),
  validateUuid(),
  controller.scheduleBroadcast
);

/**
 * POST /broadcasts/:id/send
 * Send a broadcast immediately.
 * Requires: broadcasts:update:all or broadcasts:update:own permission
 */
router.post(
  '/:id/send',
  broadcastActionLimiter,
  csrfValidateToken,
  requirePermission('broadcasts', 'update', 'own'),
  validateUuid(),
  controller.sendBroadcast
);

/**
 * POST /broadcasts/:id/pause
 * Pause a scheduled or sending broadcast.
 * Requires: broadcasts:update:all or broadcasts:update:own permission
 */
router.post(
  '/:id/pause',
  broadcastActionLimiter,
  csrfValidateToken,
  requirePermission('broadcasts', 'update', 'own'),
  validateUuid(),
  controller.pauseBroadcast
);

/**
 * POST /broadcasts/:id/resume
 * Resume a paused broadcast.
 * Requires: broadcasts:update:all or broadcasts:update:own permission
 */
router.post(
  '/:id/resume',
  broadcastActionLimiter,
  csrfValidateToken,
  requirePermission('broadcasts', 'update', 'own'),
  validateUuid(),
  controller.resumeBroadcast
);

/**
 * POST /broadcasts/:id/cancel
 * Cancel a scheduled or paused broadcast.
 * Requires: broadcasts:update:all or broadcasts:update:own permission
 */
router.post(
  '/:id/cancel',
  broadcastActionLimiter,
  csrfValidateToken,
  requirePermission('broadcasts', 'update', 'own'),
  validateUuid(),
  controller.cancelBroadcast
);

/**
 * POST /broadcasts/:id/retry
 * Retry a failed broadcast.
 * Requires: broadcasts:update:all or broadcasts:update:own permission
 */
router.post(
  '/:id/retry',
  broadcastActionLimiter,
  csrfValidateToken,
  requirePermission('broadcasts', 'update', 'own'),
  validateUuid(),
  controller.retryBroadcast
);

/**
 * PATCH /broadcasts/:id
 * Update an existing broadcast (only DRAFT or SCHEDULED status).
 * Requires: broadcasts:update:all or broadcasts:update:own permission
 */
router.patch(
  '/:id',
  csrfValidateToken,
  requirePermission('broadcasts', 'update', 'own'),
  validateUuid(),
  validateDto(UpdateBroadcastDto),
  controller.updateBroadcast
);

/**
 * DELETE /broadcasts/:id
 * Delete a broadcast (only DRAFT, COMPLETED, CANCELLED, or FAILED status).
 * Requires: broadcasts:delete:all or broadcasts:delete:own permission
 */
router.delete(
  '/:id',
  csrfValidateToken,
  requirePermission('broadcasts', 'delete', 'own'),
  validateUuid(),
  controller.deleteBroadcast
);

export default router;
