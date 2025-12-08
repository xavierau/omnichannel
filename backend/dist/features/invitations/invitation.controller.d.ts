import { Request, Response } from 'express';
import { InvitationService } from './invitation.service';
export declare class InvitationController {
    private invitationService;
    constructor(invitationService: InvitationService);
    /**
     * Create a new invitation.
     * POST /api/invitations
     *
     * Requires authentication. Uses the authenticated user's tenant.
     */
    createInvitation: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Validate an invitation token.
     * GET /api/invitations/:token
     *
     * Public endpoint - no authentication required.
     * Returns whether the token is valid and invitation details.
     */
    validateInvitation: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Accept an invitation and create user account.
     * POST /api/invitations/:token/accept
     *
     * Public endpoint - no authentication required.
     * Creates a new user account with the provided details.
     */
    acceptInvitation: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Decline an invitation.
     * POST /api/invitations/:token/decline
     *
     * Public endpoint - no authentication required.
     */
    declineInvitation: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Resend an invitation with a new token.
     * POST /api/invitations/resend
     *
     * Requires authentication. Uses the authenticated user's tenant.
     */
    resendInvitation: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * List all invitations for the authenticated user's tenant.
     * GET /api/invitations
     *
     * Requires authentication.
     * Supports pagination and status filtering.
     */
    listInvitations: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Delete an invitation.
     * DELETE /api/invitations/:id
     *
     * Requires authentication.
     */
    deleteInvitation: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
