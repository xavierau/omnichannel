"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtConfig = void 0;
require("./env.config"); // Ensure env is loaded first
exports.jwtConfig = {
    accessTokenSecret: process.env.JWT_ACCESS_SECRET || '',
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET || '',
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
};
// Validate that secrets are set
if (!exports.jwtConfig.accessTokenSecret || !exports.jwtConfig.refreshTokenSecret) {
    throw new Error('JWT secrets are not configured. Please set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in your .env file');
}
