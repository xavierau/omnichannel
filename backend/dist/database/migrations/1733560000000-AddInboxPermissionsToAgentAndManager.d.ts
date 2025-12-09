import { MigrationInterface, QueryRunner } from 'typeorm';
/**
 * Migration to add inbox permissions to agent and manager roles.
 *
 * Agent needs: inbox:read:own, inbox:update:own, inbox:message:own, inbox:assign:own, inbox:note:own
 * Manager needs: Same as agent plus additional oversight capabilities
 */
export declare class AddInboxPermissionsToAgentAndManager1733560000000 implements MigrationInterface {
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
