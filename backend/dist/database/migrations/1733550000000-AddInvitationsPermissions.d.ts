import { MigrationInterface, QueryRunner } from 'typeorm';
/**
 * Migration to add Invitations resource permissions.
 *
 * This migration:
 * 1. Updates the permissions table CHECK constraint to include 'invitations' resource
 * 2. Inserts invitation permission records for all action/scope combinations
 * 3. Assigns invitations:manage:all to super_admin and admin roles
 */
export declare class AddInvitationsPermissions1733550000000 implements MigrationInterface {
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
