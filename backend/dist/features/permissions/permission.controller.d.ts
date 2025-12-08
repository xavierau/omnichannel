import { Request, Response } from 'express';
import { PermissionCrudService } from './permission.service';
export declare class PermissionController {
    private permissionService;
    constructor(permissionService: PermissionCrudService);
    /**
     * GET /api/permissions
     * List all permissions with optional filtering
     */
    list: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * GET /api/permissions/grouped
     * Get all permissions grouped by resource
     */
    getGrouped: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * GET /api/permissions/meta
     * Get permission metadata (available resources, actions, scopes)
     */
    getMeta: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * GET /api/permissions/:id
     * Get permission by ID
     */
    getById: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
