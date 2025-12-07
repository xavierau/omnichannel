import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add inbox permissions and assign them to admin and super_admin roles.
 *
 * The inbox permissions were defined in the enum but not seeded because the
 * permissions seed script skips if any permissions already exist.
 */
export class AddInboxPermissionsToRoles1733520000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Define inbox permissions to create
    const inboxPermissions = [
      { resource: 'inbox', action: 'manage', scope: 'all', description: 'Full control over inbox' },
      { resource: 'inbox', action: 'create', scope: 'all', description: 'Can create all inbox' },
      { resource: 'inbox', action: 'create', scope: 'own', description: 'Can create own inbox' },
      { resource: 'inbox', action: 'read', scope: 'all', description: 'Can read all inbox' },
      { resource: 'inbox', action: 'read', scope: 'own', description: 'Can read own inbox' },
      { resource: 'inbox', action: 'update', scope: 'all', description: 'Can update all inbox' },
      { resource: 'inbox', action: 'update', scope: 'own', description: 'Can update own inbox' },
      { resource: 'inbox', action: 'delete', scope: 'all', description: 'Can delete all inbox' },
      { resource: 'inbox', action: 'delete', scope: 'own', description: 'Can delete own inbox' },
      { resource: 'inbox', action: 'message', scope: 'all', description: 'Can message all inbox' },
      { resource: 'inbox', action: 'message', scope: 'own', description: 'Can message own inbox' },
      { resource: 'inbox', action: 'assign', scope: 'all', description: 'Can assign all inbox' },
      { resource: 'inbox', action: 'assign', scope: 'own', description: 'Can assign own inbox' },
      { resource: 'inbox', action: 'note', scope: 'all', description: 'Can note all inbox' },
      { resource: 'inbox', action: 'note', scope: 'own', description: 'Can note own inbox' },
    ];

    // Insert inbox permissions
    for (const perm of inboxPermissions) {
      await queryRunner.query(`
        INSERT INTO "permissions" ("resource", "action", "scope", "description")
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `, [perm.resource, perm.action, perm.scope, perm.description]);
    }

    // Get super_admin role id
    const superAdminResult = await queryRunner.query(`
      SELECT id FROM "roles" WHERE name = 'super_admin'
    `);

    // Get admin role id
    const adminResult = await queryRunner.query(`
      SELECT id FROM "roles" WHERE name = 'admin'
    `);

    // Assign all inbox permissions to super_admin
    if (superAdminResult.length > 0) {
      const superAdminId = superAdminResult[0].id;
      await queryRunner.query(`
        INSERT INTO "role_permissions" ("role_id", "permission_id")
        SELECT $1, p.id FROM "permissions" p
        WHERE p.resource = 'inbox'
        ON CONFLICT DO NOTHING
      `, [superAdminId]);
    }

    // Assign inbox:manage:all to admin role
    if (adminResult.length > 0) {
      const adminId = adminResult[0].id;
      await queryRunner.query(`
        INSERT INTO "role_permissions" ("role_id", "permission_id")
        SELECT $1, p.id FROM "permissions" p
        WHERE p.resource = 'inbox' AND p.action = 'manage' AND p.scope = 'all'
        ON CONFLICT DO NOTHING
      `, [adminId]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove inbox permissions from role_permissions
    await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE "permission_id" IN (
        SELECT id FROM "permissions" WHERE resource = 'inbox'
      )
    `);

    // Remove inbox permissions
    await queryRunner.query(`
      DELETE FROM "permissions" WHERE resource = 'inbox'
    `);
  }
}
