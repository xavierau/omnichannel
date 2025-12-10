import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add API Keys resource permissions to roles.
 *
 * This migration:
 * 1. Inserts API key permission records for all action/scope combinations
 * 2. Assigns api_keys permissions to super_admin and admin roles
 */
export class AddApiKeyPermissionsToRoles1765280100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert API key permissions (same pattern as other resources)
    // manage:all
    await queryRunner.query(`
      INSERT INTO "permissions" ("id", "resource", "action", "scope", "description", "created_at", "updated_at")
      VALUES (
        gen_random_uuid(),
        'api_keys',
        'manage',
        'all',
        'Full control over API keys',
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING
    `);

    // create:all and create:own
    await queryRunner.query(`
      INSERT INTO "permissions" ("id", "resource", "action", "scope", "description", "created_at", "updated_at")
      VALUES (
        gen_random_uuid(),
        'api_keys',
        'create',
        'all',
        'Create API keys for all channel accounts',
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "permissions" ("id", "resource", "action", "scope", "description", "created_at", "updated_at")
      VALUES (
        gen_random_uuid(),
        'api_keys',
        'create',
        'own',
        'Create own API keys',
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING
    `);

    // read:all and read:own
    await queryRunner.query(`
      INSERT INTO "permissions" ("id", "resource", "action", "scope", "description", "created_at", "updated_at")
      VALUES (
        gen_random_uuid(),
        'api_keys',
        'read',
        'all',
        'View all API keys',
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "permissions" ("id", "resource", "action", "scope", "description", "created_at", "updated_at")
      VALUES (
        gen_random_uuid(),
        'api_keys',
        'read',
        'own',
        'View own API keys',
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING
    `);

    // update:all and update:own
    await queryRunner.query(`
      INSERT INTO "permissions" ("id", "resource", "action", "scope", "description", "created_at", "updated_at")
      VALUES (
        gen_random_uuid(),
        'api_keys',
        'update',
        'all',
        'Update all API keys',
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "permissions" ("id", "resource", "action", "scope", "description", "created_at", "updated_at")
      VALUES (
        gen_random_uuid(),
        'api_keys',
        'update',
        'own',
        'Update own API keys',
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING
    `);

    // delete:all and delete:own
    await queryRunner.query(`
      INSERT INTO "permissions" ("id", "resource", "action", "scope", "description", "created_at", "updated_at")
      VALUES (
        gen_random_uuid(),
        'api_keys',
        'delete',
        'all',
        'Delete all API keys',
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "permissions" ("id", "resource", "action", "scope", "description", "created_at", "updated_at")
      VALUES (
        gen_random_uuid(),
        'api_keys',
        'delete',
        'own',
        'Delete own API keys',
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING
    `);

    // Assign all api_keys permissions to super_admin role
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name = 'super_admin'
      AND p.resource = 'api_keys'
      ON CONFLICT DO NOTHING
    `);

    // Assign api_keys:manage:all to admin role
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name = 'admin'
      AND p.resource = 'api_keys'
      AND p.action = 'manage'
      AND p.scope = 'all'
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove api_keys permissions from roles
    await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE permission_id IN (
        SELECT id FROM permissions WHERE resource = 'api_keys'
      )
    `);

    // Delete api_keys permissions
    await queryRunner.query(`
      DELETE FROM "permissions" WHERE resource = 'api_keys'
    `);
  }
}
