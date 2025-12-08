import { Tenant } from '../../tenants/tenant.entity';
import { TeamMember } from './team-member.entity';
import { TeamChannelAccount } from './team-channel-account.entity';
/**
 * Team entity represents a group of users within a tenant.
 * Teams are used for access control, allowing specific users to access
 * specific channel accounts (inboxes).
 */
export declare class Team {
    id: string;
    tenantId: string;
    tenant: Tenant;
    name: string;
    description: string | null;
    isActive: boolean;
    members: TeamMember[];
    channelAccounts: TeamChannelAccount[];
    createdAt: Date;
    updatedAt: Date;
}
