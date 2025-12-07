import { IsEmail, IsNotEmpty } from 'class-validator';

/**
 * DTO for forgot password / password reset request.
 */
export class ForgotPasswordDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}
