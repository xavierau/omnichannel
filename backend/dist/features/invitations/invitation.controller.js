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
exports.InvitationController = void 0;
const tsyringe_1 = require("tsyringe");
const invitation_service_1 = require("./invitation.service");
const async_handler_1 = require("@middleware/async-handler");
const invitation_entity_1 = require("./invitation.entity");
const logger_config_1 = require("@config/logger.config");
const http_exceptions_1 = require("@shared/exceptions/http-exceptions");
/**
 * Generic error messages for invitation endpoints.
 * Using consistent messages prevents information leakage.
 */
const INVITATION_ERROR_MESSAGES = {
    INVALID_TOKEN: 'Invalid or expired invitation token',
    CREATE_FAILED: 'Failed to create invitation. Please try again.',
    ACCEPT_FAILED: 'Failed to accept invitation. Please try again.',
};
let InvitationController = class InvitationController {
    invitationService;
    constructor(invitationService) {
        this.invitationService = invitationService;
    }
    /**
     * Create a new invitation.
     * POST /api/invitations
     *
     * Requires authentication. Uses the authenticated user's tenant.
     */
    createInvitation = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const user = req.user;
        const tenantId = user.tenantId;
        if (!tenantId) {
            return res.status(400).json({
                statusCode: 400,
                message: 'User must belong to a tenant to send invitations',
            });
        }
        const { email } = req.body;
        try {
            const invitation = await this.invitationService.createInvitation(tenantId, email, user.id);
            logger_config_1.auditLogger.info('Invitation created via API', {
                invitationId: invitation.id,
                email,
                tenantId,
                createdBy: user.id,
            });
            res.status(201).json({
                data: invitation,
            });
        }
        catch (error) {
            logger_config_1.auditLogger.warn('Failed to create invitation', {
                email,
                tenantId,
                createdBy: user.id,
                errorType: error.constructor.name,
            });
            // Re-throw known exceptions
            if (error instanceof http_exceptions_1.BadRequestException ||
                error.statusCode) {
                throw error;
            }
            // Generic error for unknown cases
            return res.status(400).json({
                statusCode: 400,
                message: INVITATION_ERROR_MESSAGES.CREATE_FAILED,
            });
        }
    });
    /**
     * Validate an invitation token.
     * GET /api/invitations/:token
     *
     * Public endpoint - no authentication required.
     * Returns whether the token is valid and invitation details.
     */
    validateInvitation = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { token } = req.params;
        const result = await this.invitationService.validateInvitation(token);
        res.json({
            data: result,
        });
    });
    /**
     * Accept an invitation and create user account.
     * POST /api/invitations/:token/accept
     *
     * Public endpoint - no authentication required.
     * Creates a new user account with the provided details.
     */
    acceptInvitation = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { token } = req.params;
        const { password, firstName, lastName } = req.body;
        try {
            const result = await this.invitationService.acceptInvitation(token, password, firstName, lastName);
            logger_config_1.auditLogger.info('Invitation accepted via API', {
                userId: result.userId,
                email: result.email,
            });
            res.status(201).json({
                data: {
                    message: 'Account created successfully. You can now log in.',
                    userId: result.userId,
                    email: result.email,
                },
            });
        }
        catch (error) {
            logger_config_1.auditLogger.warn('Failed to accept invitation', {
                errorType: error.constructor.name,
            });
            // Re-throw known exceptions with their messages
            if (error instanceof http_exceptions_1.BadRequestException ||
                error.statusCode) {
                throw error;
            }
            // Generic error for unknown cases
            return res.status(400).json({
                statusCode: 400,
                message: INVITATION_ERROR_MESSAGES.ACCEPT_FAILED,
            });
        }
    });
    /**
     * Decline an invitation.
     * POST /api/invitations/:token/decline
     *
     * Public endpoint - no authentication required.
     */
    declineInvitation = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { token } = req.params;
        try {
            await this.invitationService.declineInvitation(token);
            res.json({
                data: {
                    message: 'Invitation declined successfully.',
                },
            });
        }
        catch (error) {
            // Re-throw known exceptions
            if (error instanceof http_exceptions_1.BadRequestException ||
                error.statusCode) {
                throw error;
            }
            return res.status(400).json({
                statusCode: 400,
                message: INVITATION_ERROR_MESSAGES.INVALID_TOKEN,
            });
        }
    });
    /**
     * Resend an invitation with a new token.
     * POST /api/invitations/resend
     *
     * Requires authentication. Uses the authenticated user's tenant.
     */
    resendInvitation = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const user = req.user;
        const tenantId = user.tenantId;
        if (!tenantId) {
            return res.status(400).json({
                statusCode: 400,
                message: 'User must belong to a tenant to resend invitations',
            });
        }
        const { email } = req.body;
        try {
            const invitation = await this.invitationService.resendInvitation(tenantId, email, user.id);
            logger_config_1.auditLogger.info('Invitation resent via API', {
                invitationId: invitation.id,
                email,
                tenantId,
                resentBy: user.id,
            });
            res.json({
                data: invitation,
            });
        }
        catch (error) {
            logger_config_1.auditLogger.warn('Failed to resend invitation', {
                email,
                tenantId,
                resentBy: user.id,
                errorType: error.constructor.name,
            });
            // Re-throw known exceptions
            if (error instanceof http_exceptions_1.BadRequestException ||
                error.statusCode) {
                throw error;
            }
            return res.status(400).json({
                statusCode: 400,
                message: 'Failed to resend invitation. Please try again.',
            });
        }
    });
    /**
     * List all invitations for the authenticated user's tenant.
     * GET /api/invitations
     *
     * Requires authentication.
     * Supports pagination and status filtering.
     */
    listInvitations = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const user = req.user;
        const tenantId = user.tenantId;
        if (!tenantId) {
            return res.status(400).json({
                statusCode: 400,
                message: 'User must belong to a tenant to view invitations',
            });
        }
        // Parse query parameters
        const page = parseInt(req.query.page, 10) || 1;
        const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
        const status = req.query.status;
        // Validate status if provided
        if (status && !Object.values(invitation_entity_1.InvitationStatus).includes(status)) {
            return res.status(400).json({
                statusCode: 400,
                message: `Invalid status. Must be one of: ${Object.values(invitation_entity_1.InvitationStatus).join(', ')}`,
            });
        }
        const result = await this.invitationService.getInvitationsByTenant(tenantId, {
            status,
            page,
            limit,
        });
        res.json({
            data: result.data,
            meta: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages,
            },
        });
    });
    /**
     * Delete an invitation.
     * DELETE /api/invitations/:id
     *
     * Requires authentication.
     */
    deleteInvitation = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const user = req.user;
        const tenantId = user.tenantId;
        if (!tenantId) {
            return res.status(400).json({
                statusCode: 400,
                message: 'User must belong to a tenant to delete invitations',
            });
        }
        const { id } = req.params;
        await this.invitationService.deleteInvitation(tenantId, id);
        logger_config_1.auditLogger.info('Invitation deleted via API', {
            invitationId: id,
            tenantId,
            deletedBy: user.id,
        });
        res.status(204).send();
    });
};
exports.InvitationController = InvitationController;
exports.InvitationController = InvitationController = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(invitation_service_1.InvitationService)),
    __metadata("design:paramtypes", [invitation_service_1.InvitationService])
], InvitationController);
