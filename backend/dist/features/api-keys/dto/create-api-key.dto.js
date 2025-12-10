"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateApiKeyDto = void 0;
const class_validator_1 = require("class-validator");
const api_key_permission_enum_1 = require("../enums/api-key-permission.enum");
/**
 * DTO for creating a new API key.
 *
 * Security considerations:
 * - Name is limited to 100 characters to match database schema
 * - Channel account ID must be a valid UUID if provided
 * - Permissions must be valid enum values from ApiKeyPermission
 * - At least one permission is required
 * - Expiration date is optional but must be a valid ISO date string if provided
 */
class CreateApiKeyDto {
    name;
    channelAccountId;
    permissions;
    expiresAt;
}
exports.CreateApiKeyDto = CreateApiKeyDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Name is required' }),
    (0, class_validator_1.MinLength)(1, { message: 'Name must not be empty' }),
    (0, class_validator_1.MaxLength)(100, { message: 'Name must not exceed 100 characters' }),
    __metadata("design:type", String)
], CreateApiKeyDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4', { message: 'Channel account ID must be a valid UUID' }),
    __metadata("design:type", Object)
], CreateApiKeyDto.prototype, "channelAccountId", void 0);
__decorate([
    (0, class_validator_1.IsArray)({ message: 'Permissions must be an array' }),
    (0, class_validator_1.ArrayNotEmpty)({ message: 'At least one permission is required' }),
    (0, class_validator_1.IsEnum)(api_key_permission_enum_1.ApiKeyPermission, {
        each: true,
        message: `Each permission must be one of: ${Object.values(api_key_permission_enum_1.ApiKeyPermission).join(', ')}`,
    }),
    __metadata("design:type", Array)
], CreateApiKeyDto.prototype, "permissions", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)({}, { message: 'Expiration date must be a valid ISO 8601 date string' }),
    __metadata("design:type", Object)
], CreateApiKeyDto.prototype, "expiresAt", void 0);
