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
exports.ResetPasswordDto = void 0;
const class_validator_1 = require("class-validator");
const constants_1 = require("../../../config/constants");
/**
 * DTO for password reset with token.
 */
class ResetPasswordDto {
    email;
    token;
    newPassword;
}
exports.ResetPasswordDto = ResetPasswordDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'Email is required' }),
    (0, class_validator_1.IsEmail)({}, { message: 'Please provide a valid email address' }),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'Reset token is required' }),
    (0, class_validator_1.IsString)({ message: 'Reset token must be a string' }),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "token", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'New password is required' }),
    (0, class_validator_1.IsString)({ message: 'Password must be a string' }),
    (0, class_validator_1.MinLength)(constants_1.AUTH_CONSTANTS.MIN_PASSWORD_LENGTH, {
        message: `Password must be at least ${constants_1.AUTH_CONSTANTS.MIN_PASSWORD_LENGTH} characters`,
    }),
    (0, class_validator_1.MaxLength)(constants_1.AUTH_CONSTANTS.MAX_PASSWORD_LENGTH, {
        message: `Password must be at most ${constants_1.AUTH_CONSTANTS.MAX_PASSWORD_LENGTH} characters`,
    }),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "newPassword", void 0);
