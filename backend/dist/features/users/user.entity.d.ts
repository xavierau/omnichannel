import { Role } from '../roles/role.entity';
import { Tenant } from '../tenants/tenant.entity';
export declare enum UserStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    SUSPENDED = "suspended"
}
export declare class User {
    id: string;
    tenantId: string | null;
    tenant: Tenant | null;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    status: UserStatus;
    emailVerified: boolean;
    lastLoginAt: Date | null;
    failedLoginAttempts: number;
    lockedUntil: Date | null;
    passwordResetToken: string | null;
    passwordResetExpires: Date | null;
    roles: Role[];
    createdAt: Date;
    updatedAt: Date;
}
