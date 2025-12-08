import { Request, Response } from 'express';
import { RoleService } from './role.service';
export declare class RoleController {
    private roleService;
    constructor(roleService: RoleService);
    /**
     * GET /api/roles
     * List all roles
     */
    list: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * GET /api/roles/:id
     * Get role by ID
     */
    getById: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * POST /api/roles
     * Create a new role
     */
    create: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * PATCH /api/roles/:id
     * Update a role
     */
    update: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * DELETE /api/roles/:id
     * Delete a role
     */
    delete: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * POST /api/roles/:id/permissions
     * Add permissions to a role
     */
    addPermissions: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * DELETE /api/roles/:id/permissions
     * Remove permissions from a role
     */
    removePermissions: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * PUT /api/roles/:id/permissions
     * Sync (replace) all permissions for a role
     */
    syncPermissions: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
