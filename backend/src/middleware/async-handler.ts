import { Request, Response, NextFunction } from 'express';

/**
 * Wrapper to catch async errors in route handlers
 * Usage: asyncHandler(async (req, res, next) => { ... })
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
