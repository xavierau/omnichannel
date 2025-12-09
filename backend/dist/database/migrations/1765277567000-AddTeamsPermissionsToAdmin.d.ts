import { MigrationInterface, QueryRunner } from 'typeorm';
/**
 * Migration to add teams permissions to the admin role.
 * This fixes the 403 error when admins try to access the /api/teams endpoint.
 */
export declare class AddTeamsPermissionsToAdmin1765277567000 implements MigrationInterface {
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
