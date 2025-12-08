"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tsyringe_1 = require("tsyringe");
const group_controller_1 = require("./group.controller");
const csrf_protection_1 = require("@middleware/csrf-protection");
const authenticate_1 = require("@middleware/authenticate");
const authorize_1 = require("@middleware/authorize");
const validate_dto_1 = require("@middleware/validate-dto");
const require_tenant_1 = require("@middleware/require-tenant");
const validate_uuid_1 = require("@middleware/validate-uuid");
const create_group_dto_1 = require("./dto/create-group.dto");
const update_group_dto_1 = require("./dto/update-group.dto");
const group_query_dto_1 = require("./dto/group-query.dto");
const router = (0, express_1.Router)();
const controller = tsyringe_1.container.resolve(group_controller_1.GroupController);
// All routes require authentication and tenant
router.use(authenticate_1.authenticate);
router.use(require_tenant_1.requireTenant);
/**
 * GET /groups
 * List all customer groups with pagination and filtering.
 *
 * Query params:
 * - search: string (optional) - search by name or description
 * - isStatic: boolean (optional) - filter by group type
 * - page: number (optional, default: 1)
 * - limit: number (optional, default: 20, max: 100)
 * - sortBy: string (optional, default: 'createdAt')
 * - sortOrder: 'asc' | 'desc' (optional, default: 'desc')
 */
router.get('/', (0, authorize_1.requirePermission)('customers', 'read', 'all'), (0, validate_dto_1.validateQueryDto)(group_query_dto_1.GroupQueryDto), controller.listGroups);
/**
 * GET /groups/:id
 * Get a specific customer group by ID.
 */
router.get('/:id', (0, authorize_1.requirePermission)('customers', 'read', 'all'), (0, validate_uuid_1.validateUuid)(), controller.getGroup);
/**
 * GET /groups/:id/members
 * Get paginated members of a customer group.
 *
 * Query params:
 * - page: number (optional, default: 1)
 * - limit: number (optional, default: 20, max: 100)
 */
router.get('/:id/members', (0, authorize_1.requirePermission)('customers', 'read', 'all'), (0, validate_uuid_1.validateUuid)(), (0, validate_dto_1.validateQueryDto)(group_query_dto_1.GroupMembersQueryDto), controller.getGroupMembers);
/**
 * POST /groups
 * Create a new customer group.
 *
 * Body:
 * - name: string (required, 2-255 chars)
 * - description: string (optional, max 500 chars)
 * - isStatic: boolean (required)
 * - memberIds: string[] (required if isStatic=true)
 * - criteria: GroupCriteria (required if isStatic=false)
 */
router.post('/', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('customers', 'create', 'all'), (0, validate_dto_1.validateDto)(create_group_dto_1.CreateGroupDto), controller.createGroup);
/**
 * PATCH /groups/:id
 * Update an existing customer group.
 *
 * Body (all optional):
 * - name: string (2-255 chars)
 * - description: string (max 500 chars)
 * - isStatic: boolean
 * - memberIds: string[] (required if changing to static)
 * - criteria: GroupCriteria (required if changing to dynamic)
 */
router.patch('/:id', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('customers', 'update', 'all'), (0, validate_uuid_1.validateUuid)(), (0, validate_dto_1.validateDto)(update_group_dto_1.UpdateGroupDto), controller.updateGroup);
/**
 * DELETE /groups/:id
 * Delete a customer group.
 */
router.delete('/:id', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('customers', 'delete', 'all'), (0, validate_uuid_1.validateUuid)(), controller.deleteGroup);
exports.default = router;
