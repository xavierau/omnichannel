import { Repository } from 'typeorm';
import { singleton } from 'tsyringe';
import { AppDataSource } from '@config/database.config';
import { RefreshToken } from './entities/refresh-token.entity';

@singleton()
export class RefreshTokenRepository {
  private _repository: Repository<RefreshToken> | null = null;

  /**
   * Lazy initialization of the repository to ensure AppDataSource is initialized.
   */
  private get repository(): Repository<RefreshToken> {
    if (!this._repository) {
      this._repository = AppDataSource.getRepository(RefreshToken);
    }
    return this._repository;
  }

  async create(data: {
    userId: string;
    tokenId: string;
    tokenSecretHash: string;
    expiresAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<RefreshToken> {
    const token = this.repository.create(data);
    return this.repository.save(token);
  }

  /**
   * Find token by ID (constant-time lookup)
   * This prevents timing attacks by looking up the token directly by its ID
   */
  async findByTokenId(tokenId: string): Promise<RefreshToken | null> {
    return this.repository.findOne({
      where: { tokenId, revoked: false },
      relations: ['user'],
    });
  }

  async findByUserId(userId: string): Promise<RefreshToken[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async revokeToken(id: string): Promise<void> {
    await this.repository.update(id, { revoked: true });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.repository.update(
      { userId, revoked: false },
      { revoked: true }
    );
  }

  async deleteExpiredTokens(): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now: new Date() })
      .execute();
  }
}
