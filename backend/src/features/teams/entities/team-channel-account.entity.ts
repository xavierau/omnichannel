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
import { ChannelAccount } from '../../channel-accounts/channel-account.entity';

/**
 * TeamChannelAccount entity represents the association between a team
 * and a channel account. This enables team-based access control where
 * team members can only access conversations from their assigned channel accounts.
 */
@Entity('team_channel_accounts')
@Index(['teamId', 'channelAccountId'], { unique: true })
export class TeamChannelAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'team_id' })
  teamId: string;

  @ManyToOne(() => Team, (team) => team.channelAccounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Index()
  @Column({ name: 'channel_account_id' })
  channelAccountId: string;

  @ManyToOne(() => ChannelAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_account_id' })
  channelAccount: ChannelAccount;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
