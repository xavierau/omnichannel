import { IsString, IsOptional, IsBoolean, MaxLength, MinLength } from 'class-validator';

/**
 * DTO for updating an existing team.
 */
export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Team name cannot be empty' })
  @MaxLength(100, { message: 'Team name must not exceed 100 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
