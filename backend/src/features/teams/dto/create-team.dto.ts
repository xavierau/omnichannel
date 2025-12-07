import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

/**
 * DTO for creating a new team.
 */
export class CreateTeamDto {
  @IsString()
  @MinLength(1, { message: 'Team name is required' })
  @MaxLength(100, { message: 'Team name must not exceed 100 characters' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;
}
