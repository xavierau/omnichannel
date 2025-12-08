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
exports.GroupedPermissionsResponseDto = exports.PermissionResponseDto = exports.CreatePermissionDto = void 0;
const class_validator_1 = require("class-validator");
const permission_entity_1 = require("../permission.entity");
class CreatePermissionDto {
    resource;
    action;
    scope;
    description;
}
exports.CreatePermissionDto = CreatePermissionDto;
__decorate([
    (0, class_validator_1.IsEnum)(permission_entity_1.PermissionResource, {
        message: `Resource must be one of: ${Object.values(permission_entity_1.PermissionResource).join(', ')}`,
    }),
    __metadata("design:type", String)
], CreatePermissionDto.prototype, "resource", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(permission_entity_1.PermissionAction, {
        message: `Action must be one of: ${Object.values(permission_entity_1.PermissionAction).join(', ')}`,
    }),
    __metadata("design:type", String)
], CreatePermissionDto.prototype, "action", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(permission_entity_1.PermissionScope, {
        message: `Scope must be one of: ${Object.values(permission_entity_1.PermissionScope).join(', ')}`,
    }),
    __metadata("design:type", String)
], CreatePermissionDto.prototype, "scope", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500, { message: 'Description must not exceed 500 characters' }),
    __metadata("design:type", String)
], CreatePermissionDto.prototype, "description", void 0);
class PermissionResponseDto {
    id;
    resource;
    action;
    scope;
    description;
    permissionString;
    createdAt;
    updatedAt;
    static fromEntity(permission) {
        const dto = new PermissionResponseDto();
        dto.id = permission.id;
        dto.resource = permission.resource;
        dto.action = permission.action;
        dto.scope = permission.scope;
        dto.description = permission.description;
        dto.permissionString = `${permission.resource}:${permission.action}:${permission.scope}`;
        dto.createdAt = permission.createdAt;
        dto.updatedAt = permission.updatedAt;
        return dto;
    }
}
exports.PermissionResponseDto = PermissionResponseDto;
class GroupedPermissionsResponseDto {
    resource;
    displayName;
    permissions;
    static fromGroupedMap(grouped) {
        const resourceDisplayNames = {
            [permission_entity_1.PermissionResource.BROADCASTS]: 'Broadcasts',
            [permission_entity_1.PermissionResource.CUSTOMERS]: 'Customers',
            [permission_entity_1.PermissionResource.TEMPLATES]: 'Templates',
            [permission_entity_1.PermissionResource.CONVERSATIONS]: 'Conversations',
            [permission_entity_1.PermissionResource.USERS]: 'Users',
            [permission_entity_1.PermissionResource.SETTINGS]: 'Settings',
            [permission_entity_1.PermissionResource.API_KEYS]: 'API Keys',
            [permission_entity_1.PermissionResource.CHANNELS]: 'Channels',
            [permission_entity_1.PermissionResource.CUSTOM_FIELDS]: 'Custom Fields',
            [permission_entity_1.PermissionResource.NOTES]: 'Notes',
            [permission_entity_1.PermissionResource.TEAMS]: 'Teams',
            [permission_entity_1.PermissionResource.INBOX]: 'Inbox',
        };
        const result = [];
        for (const [resource, permissions] of grouped) {
            const dto = new GroupedPermissionsResponseDto();
            dto.resource = resource;
            dto.displayName = resourceDisplayNames[resource] || resource;
            dto.permissions = permissions.map((p) => PermissionResponseDto.fromEntity(p));
            result.push(dto);
        }
        // Sort by display name
        result.sort((a, b) => a.displayName.localeCompare(b.displayName));
        return result;
    }
}
exports.GroupedPermissionsResponseDto = GroupedPermissionsResponseDto;
