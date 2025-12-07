import passport from 'passport';
import { Request, Response, NextFunction } from 'express';

// Passport JWT middleware
export const authenticate = passport.authenticate('jwt', { session: false });

// Handle passport errors
export const handleAuthError = (
  err: Error & { name?: string },
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      statusCode: 401,
      message: 'Invalid or expired token',
    });
  }
  next(err);
};
