"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeyController = void 0;
const tsyringe_1 = require("tsyringe");
const api_key_service_1 = require("../services/api-key.service");
const async_handler_1 = require("../../../middleware/async-handler");
const logger_config_1 = require("../../../config/logger.config");
const http_exceptions_1 = require("../../../shared/exceptions/http-exceptions");
/**
 * Generic error messages for API key endpoints.
 * Using consistent messages prevents information leakage.
 */
const API_KEY_ERROR_MESSAGES = {
    CREATE_FAILED: 'Failed to create API key. Please try again.',
    REVOKE_FAILED: 'Failed to revoke API key. Please try again.',
    NOT_FOUND: 'API key not found',
    INVALID_UUID: 'Invalid API key ID format',
};
/**
 * UUID v4 regex pattern for validation.
 */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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
let ApiKeyController = class ApiKeyController {
    apiKeyService;
    constructor(apiKeyService) {
        this.apiKeyService = apiKeyService;
    }
    /**
     * Format an API key entity to response DTO.
     * Excludes sensitive data (keyHash is never returned).
     */
    formatKeyResponse(apiKey) {
        return {
            id: apiKey.id,
            name: apiKey.name,
            keyPrefix: apiKey.keyPrefix,
            channelAccountId: apiKey.channelAccountId,
            channelAccountName: apiKey.channelAccount?.name ?? null,
            permissions: apiKey.permissions,
            expiresAt: apiKey.expiresAt?.toISOString() ?? null,
            lastUsedAt: apiKey.lastUsedAt?.toISOString() ?? null,
            isActive: apiKey.isActive,
            createdById: apiKey.createdById,
            createdByName: apiKey.createdBy
                ? `${apiKey.createdBy.firstName} ${apiKey.createdBy.lastName}`
                : null,
            createdAt: apiKey.createdAt.toISOString(),
            updatedAt: apiKey.updatedAt.toISOString(),
        };
    }
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
    listKeys = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        if (!tenantId) {
            throw new http_exceptions_1.BadRequestException('User must belong to a tenant to list API keys');
        }
        const keys = await this.apiKeyService.listKeys(tenantId);
        // Note: listKeys returns ApiKeyListItem[], not full ApiKey entities
        // We need to map to response DTO format
        const formattedKeys = keys.map((key) => ({
            id: key.id,
            name: key.name,
            keyPrefix: key.keyPrefix,
            channelAccountId: key.channelAccountId,
            channelAccountName: null, // Not available in list items
            permissions: key.permissions,
            expiresAt: key.expiresAt?.toISOString() ?? null,
            lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
            isActive: key.isActive,
            createdById: key.createdById,
            createdByName: null, // Not available in list items
            createdAt: key.createdAt.toISOString(),
            updatedAt: key.createdAt.toISOString(), // Use createdAt as fallback
        }));
        res.json({
            data: formattedKeys,
            meta: {
                total: formattedKeys.length,
            },
        });
    });
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
    createKey = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const user = req.user;
        const tenantId = req.tenantId;
        if (!tenantId) {
            throw new http_exceptions_1.BadRequestException('User must belong to a tenant to create API keys');
        }
        const dto = req.body;
        try {
            // Parse expiration date if provided
            const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : undefined;
            // Validate expiration date is in the future
            if (expiresAt && expiresAt <= new Date()) {
                throw new http_exceptions_1.BadRequestException('Expiration date must be in the future');
            }
            const { rawKey, apiKey } = await this.apiKeyService.createApiKey({
                tenantId,
                name: dto.name,
                permissions: dto.permissions,
                channelAccountId: dto.channelAccountId ?? null,
                expiresAt: expiresAt ?? null,
                createdById: user.id,
            });
            logger_config_1.auditLogger.info('API key created', {
                apiKeyId: apiKey.id,
                keyPrefix: apiKey.keyPrefix,
                name: apiKey.name,
                tenantId,
                createdBy: user.id,
                channelAccountId: apiKey.channelAccountId,
                permissions: apiKey.permissions,
                expiresAt: apiKey.expiresAt?.toISOString() ?? null,
            });
            const response = {
                id: apiKey.id,
                name: apiKey.name,
                keyPrefix: apiKey.keyPrefix,
                rawKey,
                channelAccountId: apiKey.channelAccountId,
                permissions: apiKey.permissions,
                expiresAt: apiKey.expiresAt?.toISOString() ?? null,
                createdAt: apiKey.createdAt.toISOString(),
            };
            res.status(201).json({
                data: response,
                message: 'API key created successfully. Store the key securely as it will not be shown again.',
            });
        }
        catch (error) {
            logger_config_1.auditLogger.warn('Failed to create API key', {
                tenantId,
                createdBy: user.id,
                name: dto.name,
                errorType: error.constructor.name,
            });
            // Re-throw known exceptions
            if (error instanceof http_exceptions_1.BadRequestException ||
                error.statusCode) {
                throw error;
            }
            // Generic error for unknown cases
            throw new http_exceptions_1.BadRequestException(API_KEY_ERROR_MESSAGES.CREATE_FAILED);
        }
    });
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
    revokeKey = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const user = req.user;
        const tenantId = req.tenantId;
        const { id } = req.params;
        if (!tenantId) {
            throw new http_exceptions_1.BadRequestException('User must belong to a tenant to revoke API keys');
        }
        // Validate UUID format
        if (!UUID_V4_REGEX.test(id)) {
            throw new http_exceptions_1.BadRequestException(API_KEY_ERROR_MESSAGES.INVALID_UUID);
        }
        try {
            // Verify the key exists and belongs to this tenant
            // Service method already scopes by tenant for security
            const apiKey = await this.apiKeyService.getKeyById(tenantId, id);
            if (!apiKey) {
                throw new http_exceptions_1.NotFoundException(API_KEY_ERROR_MESSAGES.NOT_FOUND);
            }
            if (!apiKey.isActive) {
                throw new http_exceptions_1.BadRequestException('API key is already revoked');
            }
            await this.apiKeyService.revokeKey(tenantId, id);
            logger_config_1.auditLogger.info('API key revoked', {
                apiKeyId: id,
                keyPrefix: apiKey.keyPrefix,
                name: apiKey.name,
                tenantId,
                revokedBy: user.id,
            });
            res.json({
                data: {
                    id,
                    message: 'API key revoked successfully',
                },
            });
        }
        catch (error) {
            // Log the revocation failure but don't expose internal details
            if (!(error instanceof http_exceptions_1.NotFoundException) && !(error instanceof http_exceptions_1.BadRequestException)) {
                logger_config_1.auditLogger.warn('Failed to revoke API key', {
                    apiKeyId: id,
                    tenantId,
                    revokedBy: user.id,
                    errorType: error.constructor.name,
                });
            }
            // Re-throw known exceptions
            if (error instanceof http_exceptions_1.BadRequestException ||
                error instanceof http_exceptions_1.NotFoundException ||
                error.statusCode) {
                throw error;
            }
            // Generic error for unknown cases
            throw new http_exceptions_1.BadRequestException(API_KEY_ERROR_MESSAGES.REVOKE_FAILED);
        }
    });
};
exports.ApiKeyController = ApiKeyController;
exports.ApiKeyController = ApiKeyController = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(api_key_service_1.ApiKeyService)),
    __metadata("design:paramtypes", [api_key_service_1.ApiKeyService])
], ApiKeyController);
