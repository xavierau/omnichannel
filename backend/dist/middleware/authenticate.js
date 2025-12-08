"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAuthError = exports.authenticate = void 0;
const passport_1 = __importDefault(require("passport"));
// Passport JWT middleware
exports.authenticate = passport_1.default.authenticate('jwt', { session: false });
// Handle passport errors
const handleAuthError = (err, req, res, next) => {
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            statusCode: 401,
            message: 'Invalid or expired token',
        });
    }
    next(err);
};
exports.handleAuthError = handleAuthError;
