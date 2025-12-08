import { TeamMemberRole } from '../enums';
/**
 * DTO for adding a member to a team.
 */
export declare class AddMemberDto {
    userId: string;
    role?: TeamMemberRole;
}
