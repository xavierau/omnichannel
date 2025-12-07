import { IsUUID, IsOptional, IsEnum } from 'class-validator';
import { TeamMemberRole } from '../enums';

/**
 * DTO for adding a member to a team.
 */
export class AddMemberDto {
  @IsUUID('4', { message: 'userId must be a valid UUID' })
  userId: string;

  @IsOptional()
  @IsEnum(TeamMemberRole, { message: 'role must be either "leader" or "member"' })
  role?: TeamMemberRole;
}
