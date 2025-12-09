import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { UserService } from '../users/user.service';
export declare class AuthController {
    private authService;
    private userService;
    constructor(authService: AuthService, userService: UserService);
    /**
     * Register a new user.
     *
     * Security: Returns generic error messages to prevent account enumeration.
     * Attackers cannot determine if an email is already registered based on
     * error messages or response timing.
     */
    register: (req: Request, res: Response, next: import("express").NextFunction) => void;
    login: (req: Request, res: Response, next: import("express").NextFunction) => void;
    refresh: (req: Request, res: Response, next: import("express").NextFunction) => void;
    logout: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getMe: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Request a password reset email.
     *
     * Security: Always returns success to prevent email enumeration.
     * If email exists and user is active, a reset token will be generated.
     * In production, an email would be sent with the reset link.
     */
    forgotPassword: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Reset password using the provided token.
     *
     * Security:
     * - Token is validated using constant-time comparison
     * - Token is invalidated after successful use
     * - All sessions are terminated after password change
     */
    resetPassword: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
