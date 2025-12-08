import { Request, Response, NextFunction } from 'express';
/**
 * Wrapper to catch async errors in route handlers
 * Usage: asyncHandler(async (req, res, next) => { ... })
 */
export declare const asyncHandler: (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => void;
