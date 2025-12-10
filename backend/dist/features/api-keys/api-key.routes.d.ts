import { Router } from 'express';
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
export declare function createApiKeyRoutes(): Router;
export default createApiKeyRoutes;
