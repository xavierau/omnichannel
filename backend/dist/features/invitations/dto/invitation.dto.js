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
exports.ResendInvitationDto = exports.ValidateInvitationDto = exports.AcceptInvitationDto = exports.CreateInvitationDto = void 0;
const class_validator_1 = require("class-validator");
const constants_1 = require("../../../config/constants");
class CreateInvitationDto {
    email;
}
exports.CreateInvitationDto = CreateInvitationDto;
__decorate([
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(constants_1.VALIDATION_CONSTANTS.EMAIL_MAX_LENGTH),
    __metadata("design:type", String)
], CreateInvitationDto.prototype, "email", void 0);
class AcceptInvitationDto {
    password;
    firstName;
    lastName;
}
exports.AcceptInvitationDto = AcceptInvitationDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(constants_1.AUTH_CONSTANTS.MIN_PASSWORD_LENGTH, {
        message: `Password must be at least ${constants_1.AUTH_CONSTANTS.MIN_PASSWORD_LENGTH} characters`,
    }),
    (0, class_validator_1.MaxLength)(constants_1.AUTH_CONSTANTS.MAX_PASSWORD_LENGTH, {
        message: `Password must not exceed ${constants_1.AUTH_CONSTANTS.MAX_PASSWORD_LENGTH} characters`,
    }),
    (0, class_validator_1.Matches)(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/, {
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#)',
    }),
    __metadata("design:type", String)
], AcceptInvitationDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(constants_1.VALIDATION_CONSTANTS.NAME_MIN_LENGTH, {
        message: 'First name is required',
    }),
    (0, class_validator_1.MaxLength)(constants_1.VALIDATION_CONSTANTS.NAME_MAX_LENGTH, {
        message: `First name must not exceed ${constants_1.VALIDATION_CONSTANTS.NAME_MAX_LENGTH} characters`,
    }),
    (0, class_validator_1.Matches)(/^[a-zA-Z\s'-]+$/, {
        message: 'First name can only contain letters, spaces, hyphens, and apostrophes',
    }),
    __metadata("design:type", String)
], AcceptInvitationDto.prototype, "firstName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(constants_1.VALIDATION_CONSTANTS.NAME_MIN_LENGTH, {
        message: 'Last name is required',
    }),
    (0, class_validator_1.MaxLength)(constants_1.VALIDATION_CONSTANTS.NAME_MAX_LENGTH, {
        message: `Last name must not exceed ${constants_1.VALIDATION_CONSTANTS.NAME_MAX_LENGTH} characters`,
    }),
    (0, class_validator_1.Matches)(/^[a-zA-Z\s'-]+$/, {
        message: 'Last name can only contain letters, spaces, hyphens, and apostrophes',
    }),
    __metadata("design:type", String)
], AcceptInvitationDto.prototype, "lastName", void 0);
class ValidateInvitationDto {
    token;
}
exports.ValidateInvitationDto = ValidateInvitationDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ValidateInvitationDto.prototype, "token", void 0);
class ResendInvitationDto {
    email;
}
exports.ResendInvitationDto = ResendInvitationDto;
__decorate([
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(constants_1.VALIDATION_CONSTANTS.EMAIL_MAX_LENGTH),
    __metadata("design:type", String)
], ResendInvitationDto.prototype, "email", void 0);
