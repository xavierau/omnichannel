import { IsEnum } from 'class-validator';
import { TeamMemberRole } from '../enums';

/**
 * DTO for updating a team member's role.
 */
export class UpdateMemberRoleDto {
  @IsEnum(TeamMemberRole, { message: 'role must be either "leader" or "member"' })
  role: TeamMemberRole;
}
