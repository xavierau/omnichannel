import { Request, Response, NextFunction } from 'express';
/**
 * Middleware that ensures the authenticated user has an associated tenant.
 *
 * This middleware should be applied after authentication middleware.
 * It validates that the user has a tenantId and attaches it to the request
 * for convenient access by downstream handlers.
 *
 * @throws BadRequestException if user is not associated with a tenant
 */
export declare const requireTenant: (req: Request, res: Response, next: NextFunction) => void;
declare global {
    namespace Express {
        interface Request {
            tenantId?: string;
        }
    }
}
