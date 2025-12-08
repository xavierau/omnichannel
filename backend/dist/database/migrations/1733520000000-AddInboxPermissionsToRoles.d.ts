import { MigrationInterface, QueryRunner } from 'typeorm';
/**
 * Migration to add inbox permissions and assign them to admin and super_admin roles.
 *
 * The inbox permissions were defined in the enum but not seeded because the
 * permissions seed script skips if any permissions already exist.
 */
export declare class AddInboxPermissionsToRoles1733520000000 implements MigrationInterface {
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
