import { Router } from 'express';
import { container } from 'tsyringe';
import { InvitationController } from './invitation.controller';
import { authenticate } from '@middleware/authenticate';
import { validateDto } from '@middleware/validate-dto';
import { csrfValidateToken } from '@middleware/csrf-protection';
import { requirePermission } from '@middleware/authorize';
import { requireTenant } from '@middleware/require-tenant';
import { registerLimiter, passwordResetLimiter } from '@middleware/rate-limiter';
import {
  CreateInvitationDto,
  AcceptInvitationDto,
  ResendInvitationDto,
} from './dto/invitation.dto';

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
export function createInvitationRoutes(): Router {
  const router = Router();
  const controller = container.resolve(InvitationController);

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
  router.get(
    '/',
    authenticate,
    requireTenant,
    requirePermission('invitations', 'read', 'all'),
    controller.listInvitations
  );

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
  router.post(
    '/',
    authenticate,
    requireTenant,
    registerLimiter,
    csrfValidateToken,
    requirePermission('invitations', 'create', 'all'),
    validateDto(CreateInvitationDto),
    controller.createInvitation
  );

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
  router.post(
    '/resend',
    authenticate,
    requireTenant,
    registerLimiter,
    csrfValidateToken,
    requirePermission('invitations', 'update', 'all'),
    validateDto(ResendInvitationDto),
    controller.resendInvitation
  );

  /**
   * Validate an invitation token.
   * GET /api/invitations/:token
   *
   * Public endpoint - no authentication required.
   * Returns { valid: boolean, email?, tenantName?, inviterName?, expiresAt? }
   *
   * Rate limited to prevent enumeration attacks.
   */
  router.get(
    '/:token',
    passwordResetLimiter,
    controller.validateInvitation
  );

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
  router.post(
    '/:token/accept',
    passwordResetLimiter,
    validateDto(AcceptInvitationDto),
    controller.acceptInvitation
  );

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
  router.post(
    '/:token/decline',
    passwordResetLimiter,
    controller.declineInvitation
  );

  /**
   * Delete an invitation.
   * DELETE /api/invitations/:id
   *
   * Requires authentication, tenant context, CSRF token, and invitations:delete:all permission.
   * Only invitations from the user's tenant can be deleted.
   */
  router.delete(
    '/:id',
    authenticate,
    requireTenant,
    csrfValidateToken,
    requirePermission('invitations', 'delete', 'all'),
    controller.deleteInvitation
  );

  return router;
}

export default createInvitationRoutes;
