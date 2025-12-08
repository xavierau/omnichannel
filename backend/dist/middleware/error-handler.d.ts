import { Request, Response, NextFunction } from 'express';
import { HttpException } from '@shared/exceptions/HttpException';
/**
 * Global error handler middleware.
 *
 * This middleware catches all errors thrown in the application and:
 * 1. Logs the error with appropriate context using Winston
 * 2. Returns a consistent error response to the client
 * 3. Sanitizes error messages in production to prevent information leakage
 * 4. Includes correlation ID for request tracing
 *
 * Error handling strategy:
 * - HttpException: Known application errors, log as warning (4xx) or error (5xx)
 * - Unknown errors: Log full details server-side, return generic message to client
 */
export declare function errorHandler(error: Error | HttpException, req: Request, res: Response, next: NextFunction): void;
/**
 * Async error handler wrapper for Express route handlers.
 * This catches promise rejections and forwards them to the error handler.
 *
 * @deprecated Consider using express-async-errors package instead
 */
export declare function asyncErrorHandler<T>(fn: (req: Request, res: Response, next: NextFunction) => Promise<T>): (req: Request, res: Response, next: NextFunction) => void;
