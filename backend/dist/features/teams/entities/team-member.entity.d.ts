import { Team } from './team.entity';
import { User } from '../../users/user.entity';
import { TeamMemberRole } from '../enums';
/**
 * TeamMember entity represents the membership of a user in a team.
 * Each user can be a member of multiple teams, and each team can have
 * multiple members with different roles (leader or member).
 */
export declare class TeamMember {
    id: string;
    teamId: string;
    team: Team;
    userId: string;
    user: User;
    role: TeamMemberRole;
    createdAt: Date;
}
