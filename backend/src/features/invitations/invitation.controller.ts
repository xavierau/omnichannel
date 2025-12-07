import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { InvitationService } from './invitation.service';
import { asyncHandler } from '@middleware/async-handler';
import { User } from '@features/users/user.entity';
import { InvitationStatus } from './invitation.entity';
import { auditLogger } from '@config/logger.config';
import { BadRequestException } from '@shared/exceptions/http-exceptions';

/**
 * Generic error messages for invitation endpoints.
 * Using consistent messages prevents information leakage.
 */
const INVITATION_ERROR_MESSAGES = {
  INVALID_TOKEN: 'Invalid or expired invitation token',
  CREATE_FAILED: 'Failed to create invitation. Please try again.',
  ACCEPT_FAILED: 'Failed to accept invitation. Please try again.',
} as const;

@singleton()
export class InvitationController {
  constructor(@inject(InvitationService) private invitationService: InvitationService) {}

  /**
   * Create a new invitation.
   * POST /api/invitations
   *
   * Requires authentication. Uses the authenticated user's tenant.
   */
  createInvitation = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User;
    const tenantId = user.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        statusCode: 400,
        message: 'User must belong to a tenant to send invitations',
      });
    }

    const { email } = req.body;

    try {
      const invitation = await this.invitationService.createInvitation(
        tenantId,
        email,
        user.id
      );

      auditLogger.info('Invitation created via API', {
        invitationId: invitation.id,
        email,
        tenantId,
        createdBy: user.id,
      });

      res.status(201).json({
        data: invitation,
      });
    } catch (error) {
      auditLogger.warn('Failed to create invitation', {
        email,
        tenantId,
        createdBy: user.id,
        errorType: (error as Error).constructor.name,
      });

      // Re-throw known exceptions
      if (
        error instanceof BadRequestException ||
        (error as Error & { statusCode?: number }).statusCode
      ) {
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
  validateInvitation = asyncHandler(async (req: Request, res: Response) => {
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
  acceptInvitation = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;
    const { password, firstName, lastName } = req.body;

    try {
      const result = await this.invitationService.acceptInvitation(
        token,
        password,
        firstName,
        lastName
      );

      auditLogger.info('Invitation accepted via API', {
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
    } catch (error) {
      auditLogger.warn('Failed to accept invitation', {
        errorType: (error as Error).constructor.name,
      });

      // Re-throw known exceptions with their messages
      if (
        error instanceof BadRequestException ||
        (error as Error & { statusCode?: number }).statusCode
      ) {
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
  declineInvitation = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;

    try {
      await this.invitationService.declineInvitation(token);

      res.json({
        data: {
          message: 'Invitation declined successfully.',
        },
      });
    } catch (error) {
      // Re-throw known exceptions
      if (
        error instanceof BadRequestException ||
        (error as Error & { statusCode?: number }).statusCode
      ) {
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
  resendInvitation = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User;
    const tenantId = user.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        statusCode: 400,
        message: 'User must belong to a tenant to resend invitations',
      });
    }

    const { email } = req.body;

    try {
      const invitation = await this.invitationService.resendInvitation(
        tenantId,
        email,
        user.id
      );

      auditLogger.info('Invitation resent via API', {
        invitationId: invitation.id,
        email,
        tenantId,
        resentBy: user.id,
      });

      res.json({
        data: invitation,
      });
    } catch (error) {
      auditLogger.warn('Failed to resend invitation', {
        email,
        tenantId,
        resentBy: user.id,
        errorType: (error as Error).constructor.name,
      });

      // Re-throw known exceptions
      if (
        error instanceof BadRequestException ||
        (error as Error & { statusCode?: number }).statusCode
      ) {
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
  listInvitations = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User;
    const tenantId = user.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        statusCode: 400,
        message: 'User must belong to a tenant to view invitations',
      });
    }

    // Parse query parameters
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);
    const status = req.query.status as InvitationStatus | undefined;

    // Validate status if provided
    if (status && !Object.values(InvitationStatus).includes(status)) {
      return res.status(400).json({
        statusCode: 400,
        message: `Invalid status. Must be one of: ${Object.values(InvitationStatus).join(', ')}`,
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
  deleteInvitation = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User;
    const tenantId = user.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        statusCode: 400,
        message: 'User must belong to a tenant to delete invitations',
      });
    }

    const { id } = req.params;

    await this.invitationService.deleteInvitation(tenantId, id);

    auditLogger.info('Invitation deleted via API', {
      invitationId: id,
      tenantId,
      deletedBy: user.id,
    });

    res.status(204).send();
  });
}
