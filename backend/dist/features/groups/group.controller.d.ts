import { Request, Response } from 'express';
import { GroupService } from './group.service';
/**
 * Controller for customer group management endpoints.
 * Handles HTTP requests and delegates to GroupService.
 */
export declare class GroupController {
    private groupService;
    constructor(groupService: GroupService);
    /**
     * GET /groups
     * Lists all groups with pagination, search, and filtering.
     */
    listGroups: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * GET /groups/:id
     * Gets a single group by ID with member count.
     */
    getGroup: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * GET /groups/:id/members
     * Gets paginated members of a group.
     */
    getGroupMembers: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * POST /groups
     * Creates a new customer group.
     */
    createGroup: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * PATCH /groups/:id
     * Updates an existing customer group.
     */
    updateGroup: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * DELETE /groups/:id
     * Deletes a customer group.
     */
    deleteGroup: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
