import { User } from '../../users/user.entity';
export declare class RefreshToken {
    id: string;
    userId: string;
    user: User;
    tokenId: string;
    tokenSecretHash: string;
    expiresAt: Date;
    revoked: boolean;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
    isValid(): boolean;
}
