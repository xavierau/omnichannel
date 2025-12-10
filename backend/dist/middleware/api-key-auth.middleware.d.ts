import { Request, Response, NextFunction } from 'express';
import { ApiKey } from '../features/api-keys/entities/api-key.entity';
import { ApiKeyPermission } from '../features/api-keys/enums/api-key-permission.enum';
/**
 * Extended Request interface with API key context.
 * Used when authenticating via API key instead of JWT.
 */
export interface ApiKeyRequest extends Request {
    apiKey: ApiKey;
    tenantId: string;
}
/**
 * API Key Authentication Middleware.
 *
 * Validates API keys from request headers and attaches the validated
 * ApiKey entity and tenantId to the request object.
 *
 * Supports two header formats:
 * - Authorization: Bearer <api-key>
 * - X-API-Key: <api-key>
 *
 * On successful authentication:
 * - req.apiKey is set to the validated ApiKey entity
 * - req.tenantId is set to the API key's tenant ID
 * - Usage is recorded asynchronously (does not block the request)
 *
 * Security:
 * - API keys are stored as SHA-256 hashes
 * - Keys can have expiration dates
 * - Keys can be revoked by setting isActive to false
 * - Last used timestamp is updated on each authenticated request
 *
 * @example
 * // Apply to routes
 * router.use('/api/v1', apiKeyAuth);
 *
 * // Or to specific routes
 * router.get('/conversations', apiKeyAuth, conversationController.list);
 */
export declare function apiKeyAuth(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Permission Middleware Factory.
 *
 * Returns middleware that checks if the authenticated API key has
 * at least one of the required permissions.
 *
 * Must be used after apiKeyAuth middleware.
 *
 * @param permissions - One or more permissions to check (OR logic)
 *
 * @example
 * // Require a specific permission
 * router.get(
 *   '/conversations',
 *   apiKeyAuth,
 *   requireApiKeyPermission(ApiKeyPermission.CONVERSATION_READ),
 *   controller.list
 * );
 *
 * // Multiple permissions (OR)
 * router.post(
 *   '/conversations/:id/assign',
 *   apiKeyAuth,
 *   requireApiKeyPermission(
 *     ApiKeyPermission.CONVERSATION_ASSIGN,
 *     ApiKeyPermission.CONVERSATION_UPDATE_STATUS
 *   ),
 *   controller.assign
 * );
 */
export declare function requireApiKeyPermission(...permissions: ApiKeyPermission[]): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Channel Account Scope Validation Middleware.
 *
 * Validates that the API key is authorized to access the target
 * channel account. If the API key has a channelAccountId scope,
 * the request must be for that specific channel account.
 *
 * Must be used after apiKeyAuth middleware.
 *
 * Channel account ID is extracted from:
 * 1. req.params.channelAccountId (route parameter)
 * 2. req.body.channelAccountId (request body)
 *
 * If the API key has no channel account scope (channelAccountId is null),
 * the middleware allows all channel accounts.
 *
 * @example
 * router.get(
 *   '/channel-accounts/:channelAccountId/conversations',
 *   apiKeyAuth,
 *   validateChannelAccountScope,
 *   controller.list
 * );
 */
export declare function validateChannelAccountScope(req: Request, res: Response, next: NextFunction): Promise<void>;
