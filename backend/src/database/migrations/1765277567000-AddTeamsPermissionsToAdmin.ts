import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add teams permissions to the admin role.
 * This fixes the 403 error when admins try to access the /api/teams endpoint.
 */
export class AddTeamsPermissionsToAdmin1765277567000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Get the admin role ID
    const adminRole = await queryRunner.query(`
      SELECT id FROM roles WHERE name = 'admin' LIMIT 1
    `);

    if (!adminRole || adminRole.length === 0) {
      console.log('Admin role not found, skipping migration');
      return;
    }

    const adminRoleId = adminRole[0].id;

    // Get the teams:manage:all permission ID
    const teamsPermission = await queryRunner.query(`
      SELECT id FROM permissions
      WHERE resource = 'teams' AND action = 'manage' AND scope = 'all'
      LIMIT 1
    `);

    if (!teamsPermission || teamsPermission.length === 0) {
      console.log('Teams manage:all permission not found, skipping migration');
      return;
    }

    const teamsPermissionId = teamsPermission[0].id;

    // Check if the permission is already assigned
    const existingAssignment = await queryRunner.query(`
      SELECT * FROM role_permissions
      WHERE "roleId" = $1 AND "permissionId" = $2
      LIMIT 1
    `, [adminRoleId, teamsPermissionId]);

    if (existingAssignment && existingAssignment.length > 0) {
      console.log('Teams permission already assigned to admin role');
      return;
    }

    // Assign the permission
    await queryRunner.query(`
      INSERT INTO role_permissions ("roleId", "permissionId")
      VALUES ($1, $2)
    `, [adminRoleId, teamsPermissionId]);

    console.log('Successfully added teams:manage:all permission to admin role');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Get the admin role ID
    const adminRole = await queryRunner.query(`
      SELECT id FROM roles WHERE name = 'admin' LIMIT 1
    `);

    if (!adminRole || adminRole.length === 0) {
      return;
    }

    const adminRoleId = adminRole[0].id;

    // Get the teams:manage:all permission ID
    const teamsPermission = await queryRunner.query(`
      SELECT id FROM permissions
      WHERE resource = 'teams' AND action = 'manage' AND scope = 'all'
      LIMIT 1
    `);

    if (!teamsPermission || teamsPermission.length === 0) {
      return;
    }

    const teamsPermissionId = teamsPermission[0].id;

    // Remove the permission assignment
    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE "roleId" = $1 AND "permissionId" = $2
    `, [adminRoleId, teamsPermissionId]);

    console.log('Removed teams:manage:all permission from admin role');
  }
}
