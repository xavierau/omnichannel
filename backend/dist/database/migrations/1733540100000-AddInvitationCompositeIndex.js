"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddInvitationCompositeIndex1733540100000 = void 0;
const typeorm_1 = require("typeorm");
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
class AddInvitationCompositeIndex1733540100000 {
    name = 'AddInvitationCompositeIndex1733540100000';
    async up(queryRunner) {
        // Add composite index for tenant_id + status
        // This optimizes the common query pattern of listing invitations by tenant with status filter
        await queryRunner.createIndex('invitations', new typeorm_1.TableIndex({
            name: 'IDX_invitations_tenant_status',
            columnNames: ['tenant_id', 'status'],
        }));
    }
    async down(queryRunner) {
        await queryRunner.dropIndex('invitations', 'IDX_invitations_tenant_status');
    }
}
exports.AddInvitationCompositeIndex1733540100000 = AddInvitationCompositeIndex1733540100000;
