"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tsyringe_1 = require("tsyringe");
const broadcast_controller_1 = require("./broadcast.controller");
const csrf_protection_1 = require("../../middleware/csrf-protection");
const authenticate_1 = require("../../middleware/authenticate");
const authorize_1 = require("../../middleware/authorize");
const validate_dto_1 = require("../../middleware/validate-dto");
const require_tenant_1 = require("../../middleware/require-tenant");
const validate_uuid_1 = require("../../middleware/validate-uuid");
const rate_limiter_1 = require("../../middleware/rate-limiter");
const create_broadcast_dto_1 = require("./dto/create-broadcast.dto");
const update_broadcast_dto_1 = require("./dto/update-broadcast.dto");
const broadcast_query_dto_1 = require("./dto/broadcast-query.dto");
const bulk_action_dto_1 = require("./dto/bulk-action.dto");
const router = (0, express_1.Router)();
const controller = tsyringe_1.container.resolve(broadcast_controller_1.BroadcastController);
// All routes require authentication and tenant
router.use(authenticate_1.authenticate);
router.use(require_tenant_1.requireTenant);
/**
 * GET /broadcasts
 * List all broadcasts with pagination, search, and filters.
 * Requires: broadcasts:read:all or broadcasts:read:own permission
 */
router.get('/', (0, authorize_1.requirePermission)('broadcasts', 'read', 'own'), (0, validate_dto_1.validateQueryDto)(broadcast_query_dto_1.BroadcastQueryDto), controller.listBroadcasts);
/**
 * DELETE /broadcasts/bulk
 * Bulk delete broadcasts (must be before /:id route).
 * Requires: broadcasts:delete:all permission
 */
router.delete('/bulk', rate_limiter_1.broadcastBulkLimiter, csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('broadcasts', 'delete', 'all'), (0, validate_dto_1.validateDto)(bulk_action_dto_1.BulkActionDto), controller.bulkDelete);
/**
 * POST /broadcasts/bulk-pause
 * Bulk pause multiple broadcasts.
 * Requires: broadcasts:update:all permission
 */
router.post('/bulk-pause', rate_limiter_1.broadcastBulkLimiter, csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('broadcasts', 'update', 'all'), (0, validate_dto_1.validateDto)(bulk_action_dto_1.BulkActionDto), controller.bulkPause);
/**
 * POST /broadcasts/bulk-cancel
 * Bulk cancel multiple broadcasts.
 * Requires: broadcasts:update:all permission
 */
router.post('/bulk-cancel', rate_limiter_1.broadcastBulkLimiter, csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('broadcasts', 'update', 'all'), (0, validate_dto_1.validateDto)(bulk_action_dto_1.BulkActionDto), controller.bulkCancel);
/**
 * GET /broadcasts/export/csv
 * Export broadcasts to CSV format.
 * Supports the same query filters as listBroadcasts.
 * Requires: broadcasts:read:all permission (full export access)
 */
router.get('/export/csv', (0, authorize_1.requirePermission)('broadcasts', 'read', 'all'), (0, validate_dto_1.validateQueryDto)(broadcast_query_dto_1.BroadcastQueryDto), controller.exportToCsv);
/**
 * GET /broadcasts/export/excel
 * Export broadcasts to Excel format.
 * Supports the same query filters as listBroadcasts.
 * Requires: broadcasts:read:all permission (full export access)
 */
router.get('/export/excel', (0, authorize_1.requirePermission)('broadcasts', 'read', 'all'), (0, validate_dto_1.validateQueryDto)(broadcast_query_dto_1.BroadcastQueryDto), controller.exportToExcel);
/**
 * GET /broadcasts/:id
 * Get a specific broadcast by ID.
 * Requires: broadcasts:read:all or broadcasts:read:own permission
 */
router.get('/:id', (0, authorize_1.requirePermission)('broadcasts', 'read', 'own'), (0, validate_uuid_1.validateUuid)(), controller.getBroadcast);
/**
 * GET /broadcasts/:id/report
 * Get broadcast report with detailed metrics.
 * Requires: broadcasts:read:all or broadcasts:read:own permission
 */
router.get('/:id/report', (0, authorize_1.requirePermission)('broadcasts', 'read', 'own'), (0, validate_uuid_1.validateUuid)(), controller.getBroadcastReport);
/**
 * GET /broadcasts/:id/progress/stream
 * Server-Sent Events for real-time broadcast progress.
 * Requires: broadcasts:read:all or broadcasts:read:own permission
 */
router.get('/:id/progress/stream', (0, authorize_1.requirePermission)('broadcasts', 'read', 'own'), (0, validate_uuid_1.validateUuid)(), controller.streamProgress);
/**
 * POST /broadcasts
 * Create a new broadcast.
 * Requires: broadcasts:create:all or broadcasts:create:own permission
 */
router.post('/', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('broadcasts', 'create', 'own'), (0, validate_dto_1.validateDto)(create_broadcast_dto_1.CreateBroadcastDto), controller.createBroadcast);
/**
 * POST /broadcasts/:id/schedule
 * Schedule a draft broadcast.
 * Requires: broadcasts:update:all or broadcasts:update:own permission
 */
router.post('/:id/schedule', rate_limiter_1.broadcastActionLimiter, csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('broadcasts', 'update', 'own'), (0, validate_uuid_1.validateUuid)(), controller.scheduleBroadcast);
/**
 * POST /broadcasts/:id/send
 * Send a broadcast immediately.
 * Requires: broadcasts:update:all or broadcasts:update:own permission
 */
router.post('/:id/send', rate_limiter_1.broadcastActionLimiter, csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('broadcasts', 'update', 'own'), (0, validate_uuid_1.validateUuid)(), controller.sendBroadcast);
/**
 * POST /broadcasts/:id/pause
 * Pause a scheduled or sending broadcast.
 * Requires: broadcasts:update:all or broadcasts:update:own permission
 */
router.post('/:id/pause', rate_limiter_1.broadcastActionLimiter, csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('broadcasts', 'update', 'own'), (0, validate_uuid_1.validateUuid)(), controller.pauseBroadcast);
/**
 * POST /broadcasts/:id/resume
 * Resume a paused broadcast.
 * Requires: broadcasts:update:all or broadcasts:update:own permission
 */
router.post('/:id/resume', rate_limiter_1.broadcastActionLimiter, csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('broadcasts', 'update', 'own'), (0, validate_uuid_1.validateUuid)(), controller.resumeBroadcast);
/**
 * POST /broadcasts/:id/cancel
 * Cancel a scheduled or paused broadcast.
 * Requires: broadcasts:update:all or broadcasts:update:own permission
 */
router.post('/:id/cancel', rate_limiter_1.broadcastActionLimiter, csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('broadcasts', 'update', 'own'), (0, validate_uuid_1.validateUuid)(), controller.cancelBroadcast);
/**
 * POST /broadcasts/:id/retry
 * Retry a failed broadcast.
 * Requires: broadcasts:update:all or broadcasts:update:own permission
 */
router.post('/:id/retry', rate_limiter_1.broadcastActionLimiter, csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('broadcasts', 'update', 'own'), (0, validate_uuid_1.validateUuid)(), controller.retryBroadcast);
/**
 * PATCH /broadcasts/:id
 * Update an existing broadcast (only DRAFT or SCHEDULED status).
 * Requires: broadcasts:update:all or broadcasts:update:own permission
 */
router.patch('/:id', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('broadcasts', 'update', 'own'), (0, validate_uuid_1.validateUuid)(), (0, validate_dto_1.validateDto)(update_broadcast_dto_1.UpdateBroadcastDto), controller.updateBroadcast);
/**
 * DELETE /broadcasts/:id
 * Delete a broadcast (only DRAFT, COMPLETED, CANCELLED, or FAILED status).
 * Requires: broadcasts:delete:all or broadcasts:delete:own permission
 */
router.delete('/:id', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('broadcasts', 'delete', 'own'), (0, validate_uuid_1.validateUuid)(), controller.deleteBroadcast);
exports.default = router;
