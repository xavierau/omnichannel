import { MigrationInterface, QueryRunner } from 'typeorm';
/**
 * Migration to add a composite index on (tenant_id, status) for the invitations table.
 *
 * This index optimizes queries that filter invitations by tenant and status,
 * which is a common access pattern when listing invitations for a tenant
 * with optional status filtering.
 *
 * The index covers:
 * - Listing all invitations for a tenant (uses tenant_id prefix)
 * - Listing invitations by status for a tenant (uses full composite key)
 * - Expiring old invitations by status
 */
export declare class AddInvitationCompositeIndex1733540100000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
