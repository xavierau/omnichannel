import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { ApiKeyService } from '@features/api-keys/services/api-key.service';
import { ApiKey } from '@features/api-keys/entities/api-key.entity';
import { ApiKeyPermission } from '@features/api-keys/enums/api-key-permission.enum';
import { auditLogger } from '@config/logger.config';

/**
 * Extended Request interface with API key context.
 * Used when authenticating via API key instead of JWT.
 */
export interface ApiKeyRequest extends Request {
  apiKey: ApiKey;
  tenantId: string;
}

/**
 * Error messages for API key authentication failures.
 * Using constants prevents typos and enables consistent error handling.
 */
const ErrorMessages = {
  KEY_REQUIRED: 'API key is required',
  INVALID_KEY: 'Invalid API key',
  INACTIVE_KEY: 'API key is inactive',
  EXPIRED_KEY: 'API key has expired',
  AUTH_REQUIRED: 'API key authentication required',
  INSUFFICIENT_PERMISSIONS: 'Insufficient API key permissions',
  CHANNEL_UNAUTHORIZED: 'API key is not authorized for this channel account',
} as const;

/**
 * Extract the API key from request headers.
 * Supports two formats:
 * 1. Authorization: Bearer <key>
 * 2. X-API-Key: <key>
 *
 * Authorization header takes precedence if both are present.
 */
function extractApiKey(req: Request): string | null {
  // Check Authorization header first (preferred)
  const authHeader = req.headers['authorization'];
  if (authHeader && typeof authHeader === 'string') {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      return parts[1];
    }
  }

  // Fall back to X-API-Key header
  const xApiKey = req.headers['x-api-key'];
  if (xApiKey && typeof xApiKey === 'string') {
    return xApiKey;
  }

  return null;
}

/**
 * Send a 401 Unauthorized response.
 */
function sendUnauthorized(res: Response, message: string): void {
  res.status(401).json({
    statusCode: 401,
    message,
    error: 'Unauthorized',
  });
}

/**
 * Send a 403 Forbidden response.
 */
function sendForbidden(
  res: Response,
  message: string,
  extra?: Record<string, unknown>
): void {
  res.status(403).json({
    statusCode: 403,
    message,
    error: 'Forbidden',
    ...extra,
  });
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
export async function apiKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawKey = extractApiKey(req);

    if (!rawKey) {
      sendUnauthorized(res, ErrorMessages.KEY_REQUIRED);
      return;
    }

    const apiKeyService = container.resolve(ApiKeyService);
    const apiKey = await apiKeyService.validateKey(rawKey);

    if (!apiKey) {
      auditLogger.warn('API key authentication failed: invalid key', {
        path: req.path,
        method: req.method,
      });

      sendUnauthorized(res, ErrorMessages.INVALID_KEY);
      return;
    }

    // Attach the validated API key and tenant to the request
    req.apiKey = apiKey;
    req.tenantId = apiKey.tenantId;

    // Record usage asynchronously - don't await to avoid blocking
    apiKeyService.recordUsage(apiKey.id).catch((err) => {
      // Log but don't fail the request if usage recording fails
      auditLogger.warn('Failed to record API key usage', {
        apiKeyId: apiKey.id,
        error: err.message,
      });
    });

    next();
  } catch (error) {
    next(error);
  }
}

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
export function requireApiKeyPermission(
  ...permissions: ApiKeyPermission[]
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const apiKey = req.apiKey;

    if (!apiKey) {
      sendUnauthorized(res, ErrorMessages.AUTH_REQUIRED);
      return;
    }

    const hasPermission = apiKey.hasAnyPermission(permissions);

    if (!hasPermission) {
      auditLogger.warn('API key permission denied', {
        apiKeyId: apiKey.id,
        tenantId: apiKey.tenantId,
        required: permissions,
        granted: apiKey.permissions,
        path: req.path,
        method: req.method,
      });

      sendForbidden(res, ErrorMessages.INSUFFICIENT_PERMISSIONS, {
        required: permissions,
      });
      return;
    }

    next();
  };
}

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
export async function validateChannelAccountScope(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const apiKey = req.apiKey;

  if (!apiKey) {
    sendUnauthorized(res, ErrorMessages.AUTH_REQUIRED);
    return;
  }

  // If API key has no channel account scope, allow all
  if (!apiKey.channelAccountId) {
    next();
    return;
  }

  // Get the target channel account from request
  const targetChannelAccountId =
    req.params.channelAccountId || req.body?.channelAccountId;

  // If no target specified, allow (let downstream handle validation)
  if (!targetChannelAccountId) {
    next();
    return;
  }

  // Verify scope matches
  if (apiKey.channelAccountId !== targetChannelAccountId) {
    auditLogger.warn('API key channel scope violation', {
      apiKeyId: apiKey.id,
      tenantId: apiKey.tenantId,
      allowedChannelAccountId: apiKey.channelAccountId,
      requestedChannelAccountId: targetChannelAccountId,
      path: req.path,
      method: req.method,
    });

    sendForbidden(res, ErrorMessages.CHANNEL_UNAUTHORIZED);
    return;
  }

  next();
}
