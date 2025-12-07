import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { AUTH_CONSTANTS, VALIDATION_CONSTANTS } from '@config/constants';

export class CreateInvitationDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(VALIDATION_CONSTANTS.EMAIL_MAX_LENGTH)
  email: string;
}

export class AcceptInvitationDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(AUTH_CONSTANTS.MIN_PASSWORD_LENGTH, {
    message: `Password must be at least ${AUTH_CONSTANTS.MIN_PASSWORD_LENGTH} characters`,
  })
  @MaxLength(AUTH_CONSTANTS.MAX_PASSWORD_LENGTH, {
    message: `Password must not exceed ${AUTH_CONSTANTS.MAX_PASSWORD_LENGTH} characters`,
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#)',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(VALIDATION_CONSTANTS.NAME_MIN_LENGTH, {
    message: 'First name is required',
  })
  @MaxLength(VALIDATION_CONSTANTS.NAME_MAX_LENGTH, {
    message: `First name must not exceed ${VALIDATION_CONSTANTS.NAME_MAX_LENGTH} characters`,
  })
  @Matches(/^[a-zA-Z\s'-]+$/, {
    message: 'First name can only contain letters, spaces, hyphens, and apostrophes',
  })
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(VALIDATION_CONSTANTS.NAME_MIN_LENGTH, {
    message: 'Last name is required',
  })
  @MaxLength(VALIDATION_CONSTANTS.NAME_MAX_LENGTH, {
    message: `Last name must not exceed ${VALIDATION_CONSTANTS.NAME_MAX_LENGTH} characters`,
  })
  @Matches(/^[a-zA-Z\s'-]+$/, {
    message: 'Last name can only contain letters, spaces, hyphens, and apostrophes',
  })
  lastName: string;
}

export class ValidateInvitationDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class ResendInvitationDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(VALIDATION_CONSTANTS.EMAIL_MAX_LENGTH)
  email: string;
}

export interface InvitationResponseDto {
  id: string;
  email: string;
  status: string;
  inviterName: string;
  tenantName: string;
  expiresAt: string;
  createdAt: string;
}

export interface ValidateInvitationResponseDto {
  valid: boolean;
  email?: string;
  tenantName?: string;
  inviterName?: string;
  expiresAt?: string;
}
