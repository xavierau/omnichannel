"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.asyncErrorHandler = asyncErrorHandler;
const HttpException_1 = require("@shared/exceptions/HttpException");
const logger_config_1 = require("@config/logger.config");
const request_context_1 = require("./request-context");
/**
 * Extracts user ID from request if available.
 * Returns undefined if user is not authenticated.
 */
function extractUserId(req) {
    const user = req.user;
    return user?.id;
}
/**
 * Builds request context metadata for logging.
 * This includes method, URL, user ID, and correlation ID.
 */
function buildRequestContext(req) {
    const correlationId = (0, request_context_1.getCorrelationId)(req);
    const userId = extractUserId(req);
    const duration = Date.now() - (0, request_context_1.getRequestStartTime)(req);
    return {
        correlationId,
        method: req.method,
        url: req.originalUrl,
        path: req.path,
        userId: userId || 'anonymous',
        userAgent: req.get('user-agent'),
        ip: req.ip,
        duration: `${duration}ms`,
    };
}
/**
 * Determines the appropriate log level based on HTTP status code.
 * - 5xx errors: 'error' level (server errors, need attention)
 * - 4xx errors: 'warn' level (client errors, informational)
 */
function getLogLevel(statusCode) {
    return statusCode >= 500 ? 'error' : 'warn';
}
/**
 * Sanitizes error message for client response in production.
 * Internal error details should never be exposed to clients.
 */
function sanitizeMessageForClient(message, statusCode, isProduction) {
    // Always expose 4xx error messages as they are client-facing
    if (statusCode < 500) {
        return message;
    }
    // In production, hide internal error details for 5xx errors
    if (isProduction) {
        return 'Internal server error';
    }
    // In development, expose the actual error message
    return message;
}
/**
 * Sanitizes error stack trace for logging.
 * Removes sensitive information that might appear in stack traces.
 */
function sanitizeStackForLogging(stack) {
    if (!stack) {
        return undefined;
    }
    // Remove any potential secrets that might appear in stack traces
    // This is a basic implementation; extend as needed
    return stack
        .replace(/password[=:]\s*['"]?[^'"\s]+['"]?/gi, 'password=[REDACTED]')
        .replace(/token[=:]\s*['"]?[^'"\s]+['"]?/gi, 'token=[REDACTED]')
        .replace(/secret[=:]\s*['"]?[^'"\s]+['"]?/gi, 'secret=[REDACTED]')
        .replace(/api[_-]?key[=:]\s*['"]?[^'"\s]+['"]?/gi, 'apikey=[REDACTED]');
}
/**
 * Builds the error response object to send to the client.
 */
function buildErrorResponse(statusCode, message, correlationId, path, errors) {
    const response = {
        statusCode,
        message,
        correlationId,
        timestamp: new Date().toISOString(),
        path,
    };
    if (errors && errors.length > 0) {
        response.errors = errors;
    }
    return response;
}
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
function errorHandler(error, req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
next) {
    const correlationId = (0, request_context_1.getCorrelationId)(req);
    const isProduction = process.env.NODE_ENV === 'production';
    const requestContext = buildRequestContext(req);
    // Determine status code and message
    let statusCode;
    let message;
    let errors;
    if (error instanceof HttpException_1.HttpException) {
        statusCode = error.statusCode;
        message = error.message;
        errors = error.errors;
    }
    else {
        // Unknown error - treat as 500 Internal Server Error
        statusCode = 500;
        message = error.message || 'An unexpected error occurred';
        errors = undefined;
    }
    const logLevel = getLogLevel(statusCode);
    // Build log metadata
    const logMetadata = {
        ...requestContext,
        statusCode,
        errorName: error.name,
        errorMessage: error.message,
        stack: sanitizeStackForLogging(error.stack),
        ...(errors && { validationErrors: errors }),
    };
    // Log the error with full context
    if (logLevel === 'error') {
        logger_config_1.logger.error(`Request failed: ${error.message}`, logMetadata);
    }
    else {
        logger_config_1.logger.warn(`Request failed: ${error.message}`, logMetadata);
    }
    // Sanitize message for client response
    const clientMessage = sanitizeMessageForClient(message, statusCode, isProduction);
    // Build and send error response
    const errorResponse = buildErrorResponse(statusCode, clientMessage, correlationId, req.path, 
    // Only include validation errors for 4xx responses
    statusCode < 500 ? errors : undefined);
    // Ensure correlation ID is in response headers
    res.setHeader(request_context_1.CORRELATION_ID_HEADER, correlationId);
    res.status(statusCode).json(errorResponse);
}
/**
 * Async error handler wrapper for Express route handlers.
 * This catches promise rejections and forwards them to the error handler.
 *
 * @deprecated Consider using express-async-errors package instead
 */
function asyncErrorHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
