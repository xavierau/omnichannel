import { Repository } from 'typeorm';
import { singleton } from 'tsyringe';
import { AppDataSource } from '@config/database.config';
import { Invitation, InvitationStatus } from './invitation.entity';

@singleton()
export class InvitationRepository {
  private _repository: Repository<Invitation> | null = null;

  private get repository(): Repository<Invitation> {
    if (!this._repository) {
      this._repository = AppDataSource.getRepository(Invitation);
    }
    return this._repository;
  }

  async findById(id: string): Promise<Invitation | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['tenant', 'inviter'],
    });
  }

  async findByTokenHash(tokenHash: string): Promise<Invitation | null> {
    return this.repository.findOne({
      where: { tokenHash },
      relations: ['tenant', 'inviter'],
    });
  }

  async findByEmail(email: string): Promise<Invitation[]> {
    return this.repository.find({
      where: { email },
      relations: ['tenant', 'inviter'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByTenantAndEmail(tenantId: string, email: string): Promise<Invitation | null> {
    return this.repository.findOne({
      where: { tenantId, email },
      relations: ['tenant', 'inviter'],
    });
  }

  /**
   * Find all invitations for a tenant with optional filtering and pagination.
   *
   * Eager loads both 'inviter' and 'tenant' relations to prevent N+1 queries
   * when formatting responses that include inviter and tenant names.
   *
   * @param tenantId - The tenant ID to filter by
   * @param options - Optional status filter and pagination options
   * @returns Tuple of [invitations, total count]
   */
  async findByTenant(
    tenantId: string,
    options?: {
      status?: InvitationStatus;
      skip?: number;
      take?: number;
    }
  ): Promise<[Invitation[], number]> {
    const query = this.repository
      .createQueryBuilder('invitation')
      .leftJoinAndSelect('invitation.inviter', 'inviter')
      .leftJoinAndSelect('invitation.tenant', 'tenant')
      .where('invitation.tenant_id = :tenantId', { tenantId });

    if (options?.status) {
      query.andWhere('invitation.status = :status', { status: options.status });
    }

    if (options?.skip !== undefined) {
      query.skip(options.skip);
    }

    if (options?.take !== undefined) {
      query.take(options.take);
    }

    query.orderBy('invitation.created_at', 'DESC');

    return query.getManyAndCount();
  }

  async findPendingByTenant(tenantId: string): Promise<Invitation[]> {
    return this.repository.find({
      where: {
        tenantId,
        status: InvitationStatus.PENDING,
      },
      relations: ['inviter'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(data: Partial<Invitation>): Promise<Invitation> {
    const invitation = this.repository.create(data);
    return this.repository.save(invitation);
  }

  async update(id: string, data: Partial<Invitation>): Promise<Invitation> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Invitation not found after update');
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async save(invitation: Invitation): Promise<Invitation> {
    return this.repository.save(invitation);
  }

  async markAsAccepted(id: string): Promise<Invitation> {
    return this.update(id, {
      status: InvitationStatus.ACCEPTED,
      acceptedAt: new Date(),
    });
  }

  async markAsDeclined(id: string): Promise<Invitation> {
    return this.update(id, {
      status: InvitationStatus.DECLINED,
    });
  }

  async markAsExpired(id: string): Promise<Invitation> {
    return this.update(id, {
      status: InvitationStatus.EXPIRED,
    });
  }

  async expireOldInvitations(): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .update(Invitation)
      .set({ status: InvitationStatus.EXPIRED })
      .where('status = :status', { status: InvitationStatus.PENDING })
      .andWhere('expires_at < :now', { now: new Date() })
      .execute();

    return result.affected || 0;
  }
}
