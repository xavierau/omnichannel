import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { AUTH_CONSTANTS } from '@config/constants';

/**
 * DTO for password reset with token.
 */
export class ResetPasswordDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsNotEmpty({ message: 'Reset token is required' })
  @IsString({ message: 'Reset token must be a string' })
  token: string;

  @IsNotEmpty({ message: 'New password is required' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(AUTH_CONSTANTS.MIN_PASSWORD_LENGTH, {
    message: `Password must be at least ${AUTH_CONSTANTS.MIN_PASSWORD_LENGTH} characters`,
  })
  @MaxLength(AUTH_CONSTANTS.MAX_PASSWORD_LENGTH, {
    message: `Password must be at most ${AUTH_CONSTANTS.MAX_PASSWORD_LENGTH} characters`,
  })
  newPassword: string;
}
