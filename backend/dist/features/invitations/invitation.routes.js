"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInvitationRoutes = createInvitationRoutes;
const express_1 = require("express");
const tsyringe_1 = require("tsyringe");
const invitation_controller_1 = require("./invitation.controller");
const authenticate_1 = require("../../middleware/authenticate");
const validate_dto_1 = require("../../middleware/validate-dto");
const csrf_protection_1 = require("../../middleware/csrf-protection");
const authorize_1 = require("../../middleware/authorize");
const require_tenant_1 = require("../../middleware/require-tenant");
const rate_limiter_1 = require("../../middleware/rate-limiter");
const invitation_dto_1 = require("./dto/invitation.dto");
/**
 * Create invitation routes.
 *
 * Route Security:
 * - Public routes (validate, accept, decline): Protected by rate limiting
 * - Authenticated routes (create, resend, list, delete): Protected by JWT + CSRF + Permissions
 *
 * Authorization:
 * - Invitation management requires 'invitations:manage:all' or specific action permissions
 * - All authenticated routes require tenant context
 *
 * Rate Limiting:
 * - Public acceptance routes use password reset limiter (strict)
 * - Create/resend use register limiter (moderate)
 */
function createInvitationRoutes() {
    const router = (0, express_1.Router)();
    const controller = tsyringe_1.container.resolve(invitation_controller_1.InvitationController);
    /**
     * List all invitations for the authenticated user's tenant.
     * GET /api/invitations
     *
     * Query params:
     * - page: number (default: 1)
     * - limit: number (default: 20, max: 100)
     * - status: 'pending' | 'accepted' | 'declined' | 'expired'
     *
     * Requires authentication and invitations:read:all permission.
     */
    router.get('/', authenticate_1.authenticate, require_tenant_1.requireTenant, (0, authorize_1.requirePermission)('invitations', 'read', 'all'), controller.listInvitations);
    /**
     * Create a new invitation.
     * POST /api/invitations
     *
     * Body:
     * - email: string (required)
     *
     * Requires authentication, tenant context, CSRF token, and invitations:create:all permission.
     * Rate limited to prevent spam.
     */
    router.post('/', authenticate_1.authenticate, require_tenant_1.requireTenant, rate_limiter_1.registerLimiter, csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('invitations', 'create', 'all'), (0, validate_dto_1.validateDto)(invitation_dto_1.CreateInvitationDto), controller.createInvitation);
    /**
     * Resend an invitation with a new token.
     * POST /api/invitations/resend
     *
     * Body:
     * - email: string (required)
     *
     * Requires authentication, tenant context, CSRF token, and invitations:update:all permission.
     * Rate limited to prevent spam.
     */
    router.post('/resend', authenticate_1.authenticate, require_tenant_1.requireTenant, rate_limiter_1.registerLimiter, csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('invitations', 'update', 'all'), (0, validate_dto_1.validateDto)(invitation_dto_1.ResendInvitationDto), controller.resendInvitation);
    /**
     * Validate an invitation token.
     * GET /api/invitations/:token
     *
     * Public endpoint - no authentication required.
     * Returns { valid: boolean, email?, tenantName?, inviterName?, expiresAt? }
     *
     * Rate limited to prevent enumeration attacks.
     */
    router.get('/:token', rate_limiter_1.passwordResetLimiter, controller.validateInvitation);
    /**
     * Accept an invitation and create user account.
     * POST /api/invitations/:token/accept
     *
     * Body:
     * - password: string (required)
     * - firstName: string (required)
     * - lastName: string (required)
     *
     * Public endpoint - no authentication required.
     * Rate limited strictly to prevent brute force attacks.
     *
     * Note: CSRF not required because:
     * - This is a public endpoint with no existing session
     * - The token itself serves as proof of authorization
     * - Rate limiting provides protection against abuse
     */
    router.post('/:token/accept', rate_limiter_1.passwordResetLimiter, (0, validate_dto_1.validateDto)(invitation_dto_1.AcceptInvitationDto), controller.acceptInvitation);
    /**
     * Decline an invitation.
     * POST /api/invitations/:token/decline
     *
     * Public endpoint - no authentication required.
     * Rate limited to prevent abuse.
     *
     * Note: CSRF not required because:
     * - This is a public endpoint with no existing session
     * - The token itself serves as proof of authorization
     */
    router.post('/:token/decline', rate_limiter_1.passwordResetLimiter, controller.declineInvitation);
    /**
     * Delete an invitation.
     * DELETE /api/invitations/:id
     *
     * Requires authentication, tenant context, CSRF token, and invitations:delete:all permission.
     * Only invitations from the user's tenant can be deleted.
     */
    router.delete('/:id', authenticate_1.authenticate, require_tenant_1.requireTenant, csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('invitations', 'delete', 'all'), controller.deleteInvitation);
    return router;
}
exports.default = createInvitationRoutes;
