import { Router } from 'express';
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
export declare function createInvitationRoutes(): Router;
export default createInvitationRoutes;
