"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireTenant = void 0;
const http_exceptions_1 = require("@shared/exceptions/http-exceptions");
/**
 * Middleware that ensures the authenticated user has an associated tenant.
 *
 * This middleware should be applied after authentication middleware.
 * It validates that the user has a tenantId and attaches it to the request
 * for convenient access by downstream handlers.
 *
 * @throws BadRequestException if user is not associated with a tenant
 */
const requireTenant = (req, res, next) => {
    const user = req.user;
    if (!user) {
        return next(new http_exceptions_1.BadRequestException('Authentication required'));
    }
    const tenantId = user.tenantId;
    if (!tenantId) {
        return next(new http_exceptions_1.BadRequestException('User is not associated with a tenant'));
    }
    // Attach tenantId to request for convenient access
    req.tenantId = tenantId;
    next();
};
exports.requireTenant = requireTenant;
