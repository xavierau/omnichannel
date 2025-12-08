import { Request, Response, NextFunction } from 'express';
/**
 * Request context interface for type-safe access to request metadata.
 * This interface extends the Express Request to include correlation ID
 * and other request-scoped context data.
 */
export interface RequestContext {
    correlationId: string;
    startTime: number;
}
/**
 * Extended Express Request with request context.
 * Use this type in controllers and middleware that need access to correlation ID.
 */
export interface RequestWithContext extends Request {
    context: RequestContext;
}
/**
 * HTTP header name for correlation ID.
 * Clients can provide their own correlation ID via this header,
 * otherwise a new UUID will be generated.
 */
export declare const CORRELATION_ID_HEADER = "x-correlation-id";
/**
 * Middleware that adds a correlation ID to each request.
 *
 * The correlation ID is used to trace requests across the system and
 * correlate logs, error responses, and distributed tracing.
 *
 * If the client provides a valid correlation ID via the x-correlation-id header,
 * that ID will be used. Otherwise, a new UUID v4 will be generated.
 *
 * The correlation ID is:
 * - Attached to the request object as req.context.correlationId
 * - Added to the response headers for client visibility
 */
export declare function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void;
/**
 * Type guard to check if a request has context attached.
 */
export declare function hasRequestContext(req: Request): req is RequestWithContext;
/**
 * Safely extracts correlation ID from request.
 * Returns 'unknown' if context is not available.
 */
export declare function getCorrelationId(req: Request): string;
/**
 * Safely extracts request start time.
 * Returns current time if context is not available.
 */
export declare function getRequestStartTime(req: Request): number;
