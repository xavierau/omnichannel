"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeyPermission = void 0;
/**
 * Permissions that can be granted to API keys.
 * These control what actions AI agents can perform via the API.
 */
var ApiKeyPermission;
(function (ApiKeyPermission) {
    ApiKeyPermission["CONVERSATION_READ"] = "conversation:read";
    ApiKeyPermission["CONVERSATION_UPDATE_STATUS"] = "conversation:update_status";
    ApiKeyPermission["CONVERSATION_ASSIGN"] = "conversation:assign";
    ApiKeyPermission["MESSAGE_SEND"] = "message:send";
})(ApiKeyPermission || (exports.ApiKeyPermission = ApiKeyPermission = {}));
