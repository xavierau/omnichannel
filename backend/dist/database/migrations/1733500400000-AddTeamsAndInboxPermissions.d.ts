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
export declare class AddTeamsAndInboxPermissions1733500400000 implements MigrationInterface {
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
