import { Tenant } from '../tenants/tenant.entity';
import { User } from '../users/user.entity';
export declare enum InvitationStatus {
    PENDING = "pending",
    ACCEPTED = "accepted",
    DECLINED = "declined",
    EXPIRED = "expired"
}
export declare class Invitation {
    id: string;
    tenantId: string;
    tenant: Tenant;
    email: string;
    inviterId: string;
    inviter: User;
    tokenHash: string;
    status: InvitationStatus;
    expiresAt: Date;
    acceptedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    isValid(): boolean;
    isExpired(): boolean;
}
