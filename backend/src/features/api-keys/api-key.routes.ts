import { Router } from 'express';
import { container } from 'tsyringe';
import { ApiKeyController } from './controllers/api-key.controller';
import { authenticate } from '@middleware/authenticate';
import { validateDto } from '@middleware/validate-dto';
import { csrfValidateToken } from '@middleware/csrf-protection';
import { requirePermission } from '@middleware/authorize';
import { requireTenant } from '@middleware/require-tenant';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

/**
 * Create API key management routes.
 *
 * Route Security:
 * - All routes require JWT authentication
 * - All routes require tenant context (user must belong to a tenant)
 * - Mutation routes (POST, DELETE) require CSRF token validation
 *
 * Authorization:
 * - GET /: requires 'api-keys:read:all' permission
 * - POST /: requires 'api-keys:create:all' permission
 * - DELETE /:id: requires 'api-keys:delete:all' permission
 *
 * All operations are scoped to the authenticated user's tenant.
 * Users can only manage API keys within their own tenant.
 */
export function createApiKeyRoutes(): Router {
  const router = Router();
  const controller = container.resolve(ApiKeyController);

  /**
   * List all API keys for the authenticated user's tenant.
   * GET /api/api-keys
   *
   * Response:
   * - data: Array of API key objects (without hashes)
   * - meta: { total: number }
   *
   * Requires authentication, tenant context, and api-keys:read:all permission.
   */
  router.get(
    '/',
    authenticate,
    requireTenant,
    requirePermission('api-keys', 'read', 'all'),
    controller.listKeys
  );

  /**
   * Create a new API key.
   * POST /api/api-keys
   *
   * Body:
   * - name: string (required, 1-100 chars)
   * - channelAccountId: string | null (optional UUID)
   * - permissions: ApiKeyPermission[] (required, non-empty array)
   * - expiresAt: string | null (optional ISO 8601 date)
   *
   * Response:
   * - data: Created API key with rawKey (only shown once!)
   * - message: Success message with security warning
   *
   * Requires authentication, tenant context, CSRF token, and api-keys:create:all permission.
   *
   * SECURITY WARNING: The rawKey in the response is only shown once.
   * It is never stored in plain text and cannot be retrieved again.
   */
  router.post(
    '/',
    authenticate,
    requireTenant,
    csrfValidateToken,
    requirePermission('api-keys', 'create', 'all'),
    validateDto(CreateApiKeyDto),
    controller.createKey
  );

  /**
   * Revoke (deactivate) an API key.
   * DELETE /api/api-keys/:id
   *
   * Path params:
   * - id: UUID of the API key to revoke
   *
   * Response:
   * - data: { id: string, message: string }
   *
   * Requires authentication, tenant context, CSRF token, and api-keys:delete:all permission.
   * The API key must exist and belong to the user's tenant.
   *
   * Note: This is a soft delete - the key is deactivated but not removed from the database.
   */
  router.delete(
    '/:id',
    authenticate,
    requireTenant,
    csrfValidateToken,
    requirePermission('api-keys', 'delete', 'all'),
    controller.revokeKey
  );

  return router;
}

export default createApiKeyRoutes;
