import { MigrationInterface, QueryRunner } from 'typeorm';
/**
 * Migration to create team-based access control tables.
 *
 * Tables created:
 * - teams: Team definitions per tenant
 * - team_members: User memberships in teams
 * - team_channel_accounts: Channel accounts accessible by teams
 */
export declare class CreateTeamTables1733500100000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
