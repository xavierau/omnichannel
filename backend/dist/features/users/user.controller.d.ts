import { Request, Response } from 'express';
import { UserService } from './user.service';
export declare class UserController {
    private userService;
    constructor(userService: UserService);
    getMe: (req: Request, res: Response, next: import("express").NextFunction) => void;
    listUsers: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getUser: (req: Request, res: Response, next: import("express").NextFunction) => void;
    updateUser: (req: Request, res: Response, next: import("express").NextFunction) => void;
    deleteUser: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * GET /api/users/:id/roles
     * Get roles assigned to a user
     */
    getUserRoles: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * POST /api/users/:id/roles
     * Add roles to a user
     */
    addUserRoles: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * DELETE /api/users/:id/roles
     * Remove roles from a user
     */
    removeUserRoles: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * PUT /api/users/:id/roles
     * Sync (replace) all roles for a user
     */
    syncUserRoles: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
