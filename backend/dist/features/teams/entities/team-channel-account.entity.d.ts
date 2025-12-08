import { Team } from './team.entity';
import { ChannelAccount } from '../../channel-accounts/channel-account.entity';
/**
 * TeamChannelAccount entity represents the association between a team
 * and a channel account. This enables team-based access control where
 * team members can only access conversations from their assigned channel accounts.
 */
export declare class TeamChannelAccount {
    id: string;
    teamId: string;
    team: Team;
    channelAccountId: string;
    channelAccount: ChannelAccount;
    createdAt: Date;
}
