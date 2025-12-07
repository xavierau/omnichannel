import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Team } from './team.entity';
import { User } from '../../users/user.entity';
import { TeamMemberRole } from '../enums';

/**
 * TeamMember entity represents the membership of a user in a team.
 * Each user can be a member of multiple teams, and each team can have
 * multiple members with different roles (leader or member).
 */
@Entity('team_members')
@Index(['teamId', 'userId'], { unique: true })
export class TeamMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'team_id' })
  teamId: string;

  @ManyToOne(() => Team, (team) => team.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: TeamMemberRole,
    enumName: 'team_member_role',
    default: TeamMemberRole.MEMBER,
  })
  role: TeamMemberRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
