import { Request, Response } from 'express';
import { TeamService } from './services/team.service';
/**
 * Controller for team management operations.
 *
 * Handles HTTP request/response mapping for:
 * - Team CRUD operations
 * - Team member management
 * - Team channel account access control
 */
export declare class TeamController {
    private teamService;
    constructor(teamService: TeamService);
    /**
     * GET /teams
     * List all teams for the current tenant.
     */
    listTeams: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * POST /teams
     * Create a new team.
     */
    createTeam: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * GET /teams/:id
     * Get a specific team by ID.
     */
    getTeam: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * PATCH /teams/:id
     * Update an existing team.
     */
    updateTeam: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * DELETE /teams/:id
     * Delete a team.
     */
    deleteTeam: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * GET /teams/:id/members
     * List all members of a team.
     */
    listMembers: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * POST /teams/:id/members
     * Add a member to a team.
     */
    addMember: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * DELETE /teams/:id/members/:userId
     * Remove a member from a team.
     */
    removeMember: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * PATCH /teams/:id/members/:userId/role
     * Update a team member's role.
     */
    updateMemberRole: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * GET /teams/:id/channel-accounts
     * List all channel accounts associated with a team.
     */
    listChannelAccounts: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * POST /teams/:id/channel-accounts
     * Add a channel account to a team.
     */
    addChannelAccount: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * DELETE /teams/:id/channel-accounts/:channelAccountId
     * Remove a channel account from a team.
     */
    removeChannelAccount: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
