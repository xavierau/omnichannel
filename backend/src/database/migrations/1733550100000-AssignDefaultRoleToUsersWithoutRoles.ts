import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to assign the 'agent' role to users who have no roles assigned.
 *
 * This fixes a data integrity issue where some users were created without
 * any role assignments, causing permission denied errors.
 *
 * Note: Users with super_admin or admin roles should already be correctly assigned.
 * This migration assigns the 'agent' role (lowest privilege) as the default.
 */
export class AssignDefaultRoleToUsersWithoutRoles1733550100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Find all users without any role assignment and assign them the 'agent' role
    await queryRunner.query(`
      INSERT INTO "user_roles" ("user_id", "role_id")
      SELECT u.id, r.id
      FROM users u
      CROSS JOIN roles r
      WHERE r.name = 'agent'
      AND NOT EXISTS (
        SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id
      )
    `);

    // Log how many users were affected (for debugging)
    const result = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE r.name = 'agent'
    `);
    console.log(`  ✓ Assigned agent role to users. Total users with agent role: ${result[0]?.count || 0}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: We cannot safely revert this migration because we don't know
    // which users originally had no roles vs which were intentionally agents.
    // This is a data fix migration, not a schema change.
    console.log('  ⚠️  Cannot revert role assignments - this is a data fix migration');
  }
}
