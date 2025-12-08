import { RefreshToken } from './entities/refresh-token.entity';
export declare class RefreshTokenRepository {
    private _repository;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    private get repository();
    create(data: {
        userId: string;
        tokenId: string;
        tokenSecretHash: string;
        expiresAt: Date;
        ipAddress?: string | null;
        userAgent?: string | null;
    }): Promise<RefreshToken>;
    /**
     * Find token by ID (constant-time lookup)
     * This prevents timing attacks by looking up the token directly by its ID
     */
    findByTokenId(tokenId: string): Promise<RefreshToken | null>;
    findByUserId(userId: string): Promise<RefreshToken[]>;
    revokeToken(id: string): Promise<void>;
    revokeAllUserTokens(userId: string): Promise<void>;
    deleteExpiredTokens(): Promise<void>;
}
