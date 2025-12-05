import { IsString, MinLength, MaxLength, Matches, IsOptional, IsEnum, IsArray, IsUUID } from 'class-validator';
import { UserStatus } from '../user.entity';
import { AUTH_CONSTANTS } from '@config/constants';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-zA-Z\s'-]+$/, {
    message: 'First name can only contain letters, spaces, hyphens, and apostrophes',
  })
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-zA-Z\s'-]+$/, {
    message: 'Last name can only contain letters, spaces, hyphens, and apostrophes',
  })
  lastName?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

export class UpdatePasswordDto {
  @IsString()
  @MinLength(AUTH_CONSTANTS.MIN_PASSWORD_LENGTH, {
    message: `New password must be at least ${AUTH_CONSTANTS.MIN_PASSWORD_LENGTH} characters`,
  })
  @MaxLength(AUTH_CONSTANTS.MAX_PASSWORD_LENGTH, {
    message: `New password must not exceed ${AUTH_CONSTANTS.MAX_PASSWORD_LENGTH} characters`,
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/, {
    message:
      'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#)',
  })
  newPassword: string;

  @IsString()
  @MinLength(1, { message: 'Current password is required' })
  currentPassword: string;
}

export class UserRolesDto {
  @IsArray()
  @IsUUID('4', { each: true, message: 'Each role ID must be a valid UUID' })
  roleIds: string[];
}
