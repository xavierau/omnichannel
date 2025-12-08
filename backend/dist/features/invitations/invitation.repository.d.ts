import { Invitation, InvitationStatus } from './invitation.entity';
export declare class InvitationRepository {
    private _repository;
    private get repository();
    findById(id: string): Promise<Invitation | null>;
    findByTokenHash(tokenHash: string): Promise<Invitation | null>;
    findByEmail(email: string): Promise<Invitation[]>;
    findByTenantAndEmail(tenantId: string, email: string): Promise<Invitation | null>;
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
    findByTenant(tenantId: string, options?: {
        status?: InvitationStatus;
        skip?: number;
        take?: number;
    }): Promise<[Invitation[], number]>;
    findPendingByTenant(tenantId: string): Promise<Invitation[]>;
    create(data: Partial<Invitation>): Promise<Invitation>;
    update(id: string, data: Partial<Invitation>): Promise<Invitation>;
    delete(id: string): Promise<void>;
    save(invitation: Invitation): Promise<Invitation>;
    markAsAccepted(id: string): Promise<Invitation>;
    markAsDeclined(id: string): Promise<Invitation>;
    markAsExpired(id: string): Promise<Invitation>;
    expireOldInvitations(): Promise<number>;
}
