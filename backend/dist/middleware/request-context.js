"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CORRELATION_ID_HEADER = void 0;
exports.requestContextMiddleware = requestContextMiddleware;
exports.hasRequestContext = hasRequestContext;
exports.getCorrelationId = getCorrelationId;
exports.getRequestStartTime = getRequestStartTime;
const uuid_1 = require("uuid");
/**
 * HTTP header name for correlation ID.
 * Clients can provide their own correlation ID via this header,
 * otherwise a new UUID will be generated.
 */
exports.CORRELATION_ID_HEADER = 'x-correlation-id';
/**
 * Extracts correlation ID from request if provided by client.
 * Returns undefined if not present or invalid.
 */
function extractCorrelationId(req) {
    const headerValue = req.get(exports.CORRELATION_ID_HEADER);
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
function requestContextMiddleware(req, res, next) {
    const correlationId = extractCorrelationId(req) || (0, uuid_1.v4)();
    // Attach context to request
    req.context = {
        correlationId,
        startTime: Date.now(),
    };
    // Add correlation ID to response headers for client visibility
    res.setHeader(exports.CORRELATION_ID_HEADER, correlationId);
    next();
}
/**
 * Type guard to check if a request has context attached.
 */
function hasRequestContext(req) {
    return 'context' in req && req.context !== undefined;
}
/**
 * Safely extracts correlation ID from request.
 * Returns 'unknown' if context is not available.
 */
function getCorrelationId(req) {
    if (hasRequestContext(req)) {
        return req.context.correlationId;
    }
    return 'unknown';
}
/**
 * Safely extracts request start time.
 * Returns current time if context is not available.
 */
function getRequestStartTime(req) {
    if (hasRequestContext(req)) {
        return req.context.startTime;
    }
    return Date.now();
}
