"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddInboxPermissionsToAgentAndManager1733560000000 = void 0;
/**
 * Migration to add inbox permissions to agent and manager roles.
 *
 * Agent needs: inbox:read:own, inbox:update:own, inbox:message:own, inbox:assign:own, inbox:note:own
 * Manager needs: Same as agent plus additional oversight capabilities
 */
class AddInboxPermissionsToAgentAndManager1733560000000 {
    async up(queryRunner) {
        // Get agent role id
        const agentResult = await queryRunner.query(`
      SELECT id FROM "roles" WHERE name = 'agent'
    `);
        // Get manager role id
        const managerResult = await queryRunner.query(`
      SELECT id FROM "roles" WHERE name = 'manager'
    `);
        // Permissions that agents need for inbox functionality
        const agentInboxPermissions = [
            { resource: 'inbox', action: 'read', scope: 'own' },
            { resource: 'inbox', action: 'update', scope: 'own' },
            { resource: 'inbox', action: 'message', scope: 'own' },
            { resource: 'inbox', action: 'assign', scope: 'own' },
            { resource: 'inbox', action: 'note', scope: 'own' },
        ];
        // Manager gets same permissions as agent plus read:all for oversight
        const managerInboxPermissions = [
            ...agentInboxPermissions,
            { resource: 'inbox', action: 'read', scope: 'all' },
            { resource: 'inbox', action: 'assign', scope: 'all' },
        ];
        // Assign permissions to agent role
        if (agentResult.length > 0) {
            const agentId = agentResult[0].id;
            for (const perm of agentInboxPermissions) {
                await queryRunner.query(`
          INSERT INTO "role_permissions" ("role_id", "permission_id")
          SELECT $1, p.id FROM "permissions" p
          WHERE p.resource = $2 AND p.action = $3 AND p.scope = $4
          ON CONFLICT DO NOTHING
        `, [agentId, perm.resource, perm.action, perm.scope]);
            }
        }
        // Assign permissions to manager role
        if (managerResult.length > 0) {
            const managerId = managerResult[0].id;
            for (const perm of managerInboxPermissions) {
                await queryRunner.query(`
          INSERT INTO "role_permissions" ("role_id", "permission_id")
          SELECT $1, p.id FROM "permissions" p
          WHERE p.resource = $2 AND p.action = $3 AND p.scope = $4
          ON CONFLICT DO NOTHING
        `, [managerId, perm.resource, perm.action, perm.scope]);
            }
        }
    }
    async down(queryRunner) {
        // Get agent role id
        const agentResult = await queryRunner.query(`
      SELECT id FROM "roles" WHERE name = 'agent'
    `);
        // Get manager role id
        const managerResult = await queryRunner.query(`
      SELECT id FROM "roles" WHERE name = 'manager'
    `);
        // Remove inbox permissions from agent role
        if (agentResult.length > 0) {
            const agentId = agentResult[0].id;
            await queryRunner.query(`
        DELETE FROM "role_permissions"
        WHERE role_id = $1 AND permission_id IN (
          SELECT id FROM "permissions" WHERE resource = 'inbox'
        )
      `, [agentId]);
        }
        // Remove inbox permissions from manager role
        if (managerResult.length > 0) {
            const managerId = managerResult[0].id;
            await queryRunner.query(`
        DELETE FROM "role_permissions"
        WHERE role_id = $1 AND permission_id IN (
          SELECT id FROM "permissions" WHERE resource = 'inbox'
        )
      `, [managerId]);
        }
    }
}
exports.AddInboxPermissionsToAgentAndManager1733560000000 = AddInboxPermissionsToAgentAndManager1733560000000;
