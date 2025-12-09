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
exports.UserRolesDto = exports.UpdatePasswordDto = exports.UpdateUserDto = void 0;
const class_validator_1 = require("class-validator");
const user_entity_1 = require("../user.entity");
const constants_1 = require("../../../config/constants");
class UpdateUserDto {
    firstName;
    lastName;
    status;
}
exports.UpdateUserDto = UpdateUserDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(100),
    (0, class_validator_1.Matches)(/^[a-zA-Z\s'-]+$/, {
        message: 'First name can only contain letters, spaces, hyphens, and apostrophes',
    }),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "firstName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(100),
    (0, class_validator_1.Matches)(/^[a-zA-Z\s'-]+$/, {
        message: 'Last name can only contain letters, spaces, hyphens, and apostrophes',
    }),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "lastName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(user_entity_1.UserStatus),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "status", void 0);
class UpdatePasswordDto {
    newPassword;
    currentPassword;
}
exports.UpdatePasswordDto = UpdatePasswordDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(constants_1.AUTH_CONSTANTS.MIN_PASSWORD_LENGTH, {
        message: `New password must be at least ${constants_1.AUTH_CONSTANTS.MIN_PASSWORD_LENGTH} characters`,
    }),
    (0, class_validator_1.MaxLength)(constants_1.AUTH_CONSTANTS.MAX_PASSWORD_LENGTH, {
        message: `New password must not exceed ${constants_1.AUTH_CONSTANTS.MAX_PASSWORD_LENGTH} characters`,
    }),
    (0, class_validator_1.Matches)(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/, {
        message: 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#)',
    }),
    __metadata("design:type", String)
], UpdatePasswordDto.prototype, "newPassword", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'Current password is required' }),
    __metadata("design:type", String)
], UpdatePasswordDto.prototype, "currentPassword", void 0);
class UserRolesDto {
    roleIds;
}
exports.UserRolesDto = UserRolesDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUUID)('4', { each: true, message: 'Each role ID must be a valid UUID' }),
    __metadata("design:type", Array)
], UserRolesDto.prototype, "roleIds", void 0);
