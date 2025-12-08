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
exports.RoleResponseDto = exports.RolePermissionsDto = exports.UpdateRoleDto = exports.CreateRoleDto = void 0;
const class_validator_1 = require("class-validator");
class CreateRoleDto {
    name;
    displayName;
    description;
    level;
    isSystem;
}
exports.CreateRoleDto = CreateRoleDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: 'Role name must be at least 2 characters' }),
    (0, class_validator_1.MaxLength)(50, { message: 'Role name must not exceed 50 characters' }),
    (0, class_validator_1.Matches)(/^[a-z][a-z0-9_]*$/, {
        message: 'Role name must start with lowercase letter and contain only lowercase letters, numbers, and underscores',
    }),
    __metadata("design:type", String)
], CreateRoleDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: 'Display name must be at least 2 characters' }),
    (0, class_validator_1.MaxLength)(100, { message: 'Display name must not exceed 100 characters' }),
    __metadata("design:type", String)
], CreateRoleDto.prototype, "displayName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500, { message: 'Description must not exceed 500 characters' }),
    __metadata("design:type", String)
], CreateRoleDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsInt)({ message: 'Level must be an integer' }),
    (0, class_validator_1.Min)(1, { message: 'Level must be at least 1' }),
    (0, class_validator_1.Max)(10, { message: 'Level must not exceed 10' }),
    __metadata("design:type", Number)
], CreateRoleDto.prototype, "level", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateRoleDto.prototype, "isSystem", void 0);
class UpdateRoleDto {
    name;
    displayName;
    description;
    level;
}
exports.UpdateRoleDto = UpdateRoleDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: 'Role name must be at least 2 characters' }),
    (0, class_validator_1.MaxLength)(50, { message: 'Role name must not exceed 50 characters' }),
    (0, class_validator_1.Matches)(/^[a-z][a-z0-9_]*$/, {
        message: 'Role name must start with lowercase letter and contain only lowercase letters, numbers, and underscores',
    }),
    __metadata("design:type", String)
], UpdateRoleDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: 'Display name must be at least 2 characters' }),
    (0, class_validator_1.MaxLength)(100, { message: 'Display name must not exceed 100 characters' }),
    __metadata("design:type", String)
], UpdateRoleDto.prototype, "displayName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500, { message: 'Description must not exceed 500 characters' }),
    __metadata("design:type", String)
], UpdateRoleDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: 'Level must be an integer' }),
    (0, class_validator_1.Min)(1, { message: 'Level must be at least 1' }),
    (0, class_validator_1.Max)(10, { message: 'Level must not exceed 10' }),
    __metadata("design:type", Number)
], UpdateRoleDto.prototype, "level", void 0);
class RolePermissionsDto {
    permissionIds;
}
exports.RolePermissionsDto = RolePermissionsDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUUID)('4', { each: true, message: 'Each permission ID must be a valid UUID' }),
    __metadata("design:type", Array)
], RolePermissionsDto.prototype, "permissionIds", void 0);
class RoleResponseDto {
    id;
    name;
    displayName;
    description;
    level;
    isSystem;
    permissions;
    userCount;
    createdAt;
    updatedAt;
    static fromEntity(role, includePermissions = true, userCount) {
        const dto = new RoleResponseDto();
        dto.id = role.id;
        dto.name = role.name;
        dto.displayName = role.displayName;
        dto.description = role.description;
        dto.level = role.level;
        dto.isSystem = role.isSystem;
        dto.createdAt = role.createdAt;
        dto.updatedAt = role.updatedAt;
        if (includePermissions && role.permissions) {
            dto.permissions = role.permissions.map((p) => ({
                id: p.id,
                resource: p.resource,
                action: p.action,
                scope: p.scope,
            }));
        }
        if (userCount !== undefined) {
            dto.userCount = userCount;
        }
        return dto;
    }
}
exports.RoleResponseDto = RoleResponseDto;
