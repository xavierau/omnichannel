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
export declare class AssignDefaultRoleToUsersWithoutRoles1733550100000 implements MigrationInterface {
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
