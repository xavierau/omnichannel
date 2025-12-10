import { Request, Response } from 'express';
import { ApiKeyService } from '../services/api-key.service';
/**
 * Controller for API key management endpoints.
 *
 * All endpoints require JWT authentication and tenant context.
 * Mutation endpoints (POST, DELETE) require CSRF validation.
 *
 * Security considerations:
 * - Raw keys are only returned once during creation
 * - Key hashes are never exposed in responses
 * - All operations are scoped to the authenticated user's tenant
 * - Audit logging for all key lifecycle events
 */
export declare class ApiKeyController {
    private readonly apiKeyService;
    constructor(apiKeyService: ApiKeyService);
    /**
     * Format an API key entity to response DTO.
     * Excludes sensitive data (keyHash is never returned).
     */
    private formatKeyResponse;
    /**
     * List all API keys for the authenticated user's tenant.
     * GET /api/api-keys
     *
     * Returns keys without their hashes (for security).
     * Supports pagination via query params (page, limit).
     *
     * @requires Authentication - JWT token required
     * @requires Permission - api-keys:read:all
     */
    listKeys: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Create a new API key.
     * POST /api/api-keys
     *
     * Returns the raw key (only time it's shown!) along with key metadata.
     * The raw key should be securely stored by the user as it cannot be retrieved again.
     *
     * @requires Authentication - JWT token required
     * @requires Permission - api-keys:create:all
     * @requires CSRF - Token validation required
     */
    createKey: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Revoke (deactivate) an API key.
     * DELETE /api/api-keys/:id
     *
     * Soft-deletes the key by setting isActive to false.
     * The key can no longer be used for authentication after revocation.
     *
     * @requires Authentication - JWT token required
     * @requires Permission - api-keys:delete:all
     * @requires CSRF - Token validation required
     */
    revokeKey: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
