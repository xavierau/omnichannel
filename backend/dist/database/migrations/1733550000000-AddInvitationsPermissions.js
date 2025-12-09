"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddInvitationsPermissions1733550000000 = void 0;
/**
 * Migration to add Invitations resource permissions.
 *
 * This migration:
 * 1. Updates the permissions table CHECK constraint to include 'invitations' resource
 * 2. Inserts invitation permission records for all action/scope combinations
 * 3. Assigns invitations:manage:all to super_admin and admin roles
 */
class AddInvitationsPermissions1733550000000 {
    async up(queryRunner) {
        // Drop existing CHECK constraint on permissions table
        await queryRunner.query(`
      ALTER TABLE "permissions" DROP CONSTRAINT IF EXISTS "permissions_resource_check"
    `);
        // Add updated CHECK constraint for resources (including invitations)
        await queryRunner.query(`
      ALTER TABLE "permissions" ADD CONSTRAINT "permissions_resource_check"
      CHECK ("resource" IN (
        'broadcasts', 'customers', 'templates', 'conversations',
        'users', 'settings', 'api_keys', 'channels', 'custom_fields',
        'notes', 'teams', 'inbox', 'invitations'
      ))
    `);
        // Insert invitation permissions (same pattern as other resources)
        // manage:all
        await queryRunner.query(`
      INSERT INTO "permissions" ("id", "resource", "action", "scope", "description", "created_at", "updated_at")
      VALUES (
        gen_random_uuid(),
        'invitations',
        'manage',
        'all',
        'Full control over invitations',
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
        'invitations',
        'create',
        'all',
        'Create invitations for all users',
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING
    `);
        await queryRunner.query(`
      INSERT INTO "permissions" ("id", "resource", "action", "scope", "description", "created_at", "updated_at")
      VALUES (
        gen_random_uuid(),
        'invitations',
        'create',
        'own',
        'Create own invitations',
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
        'invitations',
        'read',
        'all',
        'View all invitations',
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING
    `);
        await queryRunner.query(`
      INSERT INTO "permissions" ("id", "resource", "action", "scope", "description", "created_at", "updated_at")
      VALUES (
        gen_random_uuid(),
        'invitations',
        'read',
        'own',
        'View own invitations',
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
        'invitations',
        'update',
        'all',
        'Update all invitations',
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING
    `);
        await queryRunner.query(`
      INSERT INTO "permissions" ("id", "resource", "action", "scope", "description", "created_at", "updated_at")
      VALUES (
        gen_random_uuid(),
        'invitations',
        'update',
        'own',
        'Update own invitations',
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
        'invitations',
        'delete',
        'all',
        'Delete all invitations',
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING
    `);
        await queryRunner.query(`
      INSERT INTO "permissions" ("id", "resource", "action", "scope", "description", "created_at", "updated_at")
      VALUES (
        gen_random_uuid(),
        'invitations',
        'delete',
        'own',
        'Delete own invitations',
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING
    `);
        // Assign invitations:manage:all to super_admin role (they should already have all permissions)
        // For super_admin, we add all invitation permissions
        await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name = 'super_admin'
      AND p.resource = 'invitations'
      ON CONFLICT DO NOTHING
    `);
        // Assign invitations:manage:all to admin role
        await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name = 'admin'
      AND p.resource = 'invitations'
      AND p.action = 'manage'
      AND p.scope = 'all'
      ON CONFLICT DO NOTHING
    `);
    }
    async down(queryRunner) {
        // Remove invitation permissions from roles
        await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE permission_id IN (
        SELECT id FROM permissions WHERE resource = 'invitations'
      )
    `);
        // Delete invitation permissions
        await queryRunner.query(`
      DELETE FROM "permissions" WHERE resource = 'invitations'
    `);
        // Drop the updated constraint
        await queryRunner.query(`
      ALTER TABLE "permissions" DROP CONSTRAINT IF EXISTS "permissions_resource_check"
    `);
        // Restore previous CHECK constraint (without invitations)
        await queryRunner.query(`
      ALTER TABLE "permissions" ADD CONSTRAINT "permissions_resource_check"
      CHECK ("resource" IN (
        'broadcasts', 'customers', 'templates', 'conversations',
        'users', 'settings', 'api_keys', 'channels', 'custom_fields',
        'notes', 'teams', 'inbox'
      ))
    `);
    }
}
exports.AddInvitationsPermissions1733550000000 = AddInvitationsPermissions1733550000000;
