import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add Teams and Inbox resources and new permission actions.
 *
 * This migration:
 * 1. Updates the permissions table CHECK constraint to include 'teams' and 'inbox' resources
 * 2. Updates the permissions table CHECK constraint to include 'message', 'assign', 'note' actions
 *
 * Note: The actual permission records are created by the seed script, which generates
 * all combinations of resources, actions, and scopes from the PermissionResource,
 * PermissionAction, and PermissionScope enums.
 */
export class AddTeamsAndInboxPermissions1733500400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop existing CHECK constraints on permissions table
    await queryRunner.query(`
      ALTER TABLE "permissions" DROP CONSTRAINT IF EXISTS "permissions_resource_check"
    `);

    await queryRunner.query(`
      ALTER TABLE "permissions" DROP CONSTRAINT IF EXISTS "permissions_action_check"
    `);

    // Add updated CHECK constraint for resources (including teams and inbox)
    await queryRunner.query(`
      ALTER TABLE "permissions" ADD CONSTRAINT "permissions_resource_check"
      CHECK ("resource" IN (
        'broadcasts', 'customers', 'templates', 'conversations',
        'users', 'settings', 'api_keys', 'channels', 'custom_fields',
        'notes', 'teams', 'inbox'
      ))
    `);

    // Add updated CHECK constraint for actions (including message, assign, note)
    await queryRunner.query(`
      ALTER TABLE "permissions" ADD CONSTRAINT "permissions_action_check"
      CHECK ("action" IN ('create', 'read', 'update', 'delete', 'manage', 'message', 'assign', 'note'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the updated constraints
    await queryRunner.query(`
      ALTER TABLE "permissions" DROP CONSTRAINT IF EXISTS "permissions_resource_check"
    `);

    await queryRunner.query(`
      ALTER TABLE "permissions" DROP CONSTRAINT IF EXISTS "permissions_action_check"
    `);

    // Restore original CHECK constraints
    await queryRunner.query(`
      ALTER TABLE "permissions" ADD CONSTRAINT "permissions_resource_check"
      CHECK ("resource" IN (
        'broadcasts', 'customers', 'templates', 'conversations',
        'users', 'settings', 'api_keys', 'channels', 'custom_fields', 'notes'
      ))
    `);

    await queryRunner.query(`
      ALTER TABLE "permissions" ADD CONSTRAINT "permissions_action_check"
      CHECK ("action" IN ('create', 'read', 'update', 'delete', 'manage'))
    `);
  }
}
