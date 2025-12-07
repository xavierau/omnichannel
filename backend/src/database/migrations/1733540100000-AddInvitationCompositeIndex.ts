import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

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
export class AddInvitationCompositeIndex1733540100000 implements MigrationInterface {
  name = 'AddInvitationCompositeIndex1733540100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add composite index for tenant_id + status
    // This optimizes the common query pattern of listing invitations by tenant with status filter
    await queryRunner.createIndex(
      'invitations',
      new TableIndex({
        name: 'IDX_invitations_tenant_status',
        columnNames: ['tenant_id', 'status'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('invitations', 'IDX_invitations_tenant_status');
  }
}
