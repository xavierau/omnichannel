import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

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
export const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Extracts correlation ID from request if provided by client.
 * Returns undefined if not present or invalid.
 */
function extractCorrelationId(req: Request): string | undefined {
  const headerValue = req.get(CORRELATION_ID_HEADER);

  if (!headerValue || typeof headerValue !== 'string') {
    return undefined;
  }

  // Basic validation: correlation ID should be a reasonable length
  // and contain only alphanumeric characters, hyphens, and underscores
  const sanitized = headerValue.trim();
  if (sanitized.length === 0 || sanitized.length > 128) {
    return undefined;
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(sanitized)) {
    return undefined;
  }

  return sanitized;
}

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
export function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const correlationId = extractCorrelationId(req) || uuidv4();

  // Attach context to request
  (req as RequestWithContext).context = {
    correlationId,
    startTime: Date.now(),
  };

  // Add correlation ID to response headers for client visibility
  res.setHeader(CORRELATION_ID_HEADER, correlationId);

  next();
}

/**
 * Type guard to check if a request has context attached.
 */
export function hasRequestContext(req: Request): req is RequestWithContext {
  return 'context' in req && req.context !== undefined;
}

/**
 * Safely extracts correlation ID from request.
 * Returns 'unknown' if context is not available.
 */
export function getCorrelationId(req: Request): string {
  if (hasRequestContext(req)) {
    return req.context.correlationId;
  }
  return 'unknown';
}

/**
 * Safely extracts request start time.
 * Returns current time if context is not available.
 */
export function getRequestStartTime(req: Request): number {
  if (hasRequestContext(req)) {
    return req.context.startTime;
  }
  return Date.now();
}
