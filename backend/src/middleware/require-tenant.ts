import { Request, Response, NextFunction } from 'express';
import { BadRequestException } from '@shared/exceptions/http-exceptions';
import { User } from '@features/users/user.entity';

// Extended Request type with tenantId
interface TenantRequest extends Request {
  tenantId?: string;
}

/**
 * Middleware that ensures the authenticated user has an associated tenant.
 *
 * This middleware should be applied after authentication middleware.
 * It validates that the user has a tenantId and attaches it to the request
 * for convenient access by downstream handlers.
 *
 * @throws BadRequestException if user is not associated with a tenant
 */
export const requireTenant = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const user = req.user as User | undefined;

  if (!user) {
    return next(new BadRequestException('Authentication required'));
  }

  const tenantId = user.tenantId;

  if (!tenantId) {
    return next(new BadRequestException('User is not associated with a tenant'));
  }

  // Attach tenantId to request for convenient access
  (req as TenantRequest).tenantId = tenantId;

  next();
};

// Extend Express Request type to include tenantId
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}
