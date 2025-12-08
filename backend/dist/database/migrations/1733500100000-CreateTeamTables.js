"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateTeamTables1733500100000 = void 0;
const typeorm_1 = require("typeorm");
/**
 * Migration to create team-based access control tables.
 *
 * Tables created:
 * - teams: Team definitions per tenant
 * - team_members: User memberships in teams
 * - team_channel_accounts: Channel accounts accessible by teams
 */
class CreateTeamTables1733500100000 {
    name = 'CreateTeamTables1733500100000';
    async up(queryRunner) {
        // Create team_member_role enum
        await queryRunner.query(`
      CREATE TYPE team_member_role AS ENUM ('leader', 'member')
    `);
        // Create teams table
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'teams',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    generationStrategy: 'uuid',
                    default: 'uuid_generate_v4()',
                },
                {
                    name: 'tenant_id',
                    type: 'uuid',
                    isNullable: false,
                },
                {
                    name: 'name',
                    type: 'varchar',
                    length: '100',
                    isNullable: false,
                },
                {
                    name: 'description',
                    type: 'text',
                    isNullable: true,
                },
                {
                    name: 'is_active',
                    type: 'boolean',
                    default: true,
                },
                {
                    name: 'created_at',
                    type: 'timestamp with time zone',
                    default: 'CURRENT_TIMESTAMP',
                },
                {
                    name: 'updated_at',
                    type: 'timestamp with time zone',
                    default: 'CURRENT_TIMESTAMP',
                },
            ],
        }), true);
        // Add unique constraint for team name per tenant
        await queryRunner.createIndex('teams', new typeorm_1.TableIndex({
            name: 'IDX_teams_tenant_name_unique',
            columnNames: ['tenant_id', 'name'],
            isUnique: true,
        }));
        // Add foreign key to tenants
        await queryRunner.createForeignKey('teams', new typeorm_1.TableForeignKey({
            name: 'FK_teams_tenant',
            columnNames: ['tenant_id'],
            referencedTableName: 'tenants',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
        }));
        // Create team_members table
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'team_members',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    generationStrategy: 'uuid',
                    default: 'uuid_generate_v4()',
                },
                {
                    name: 'team_id',
                    type: 'uuid',
                    isNullable: false,
                },
                {
                    name: 'user_id',
                    type: 'uuid',
                    isNullable: false,
                },
                {
                    name: 'role',
                    type: 'team_member_role',
                    default: "'member'",
                },
                {
                    name: 'created_at',
                    type: 'timestamp with time zone',
                    default: 'CURRENT_TIMESTAMP',
                },
            ],
        }), true);
        // Add unique constraint for user per team
        await queryRunner.createIndex('team_members', new typeorm_1.TableIndex({
            name: 'IDX_team_members_team_user_unique',
            columnNames: ['team_id', 'user_id'],
            isUnique: true,
        }));
        // Add index for user lookup
        await queryRunner.createIndex('team_members', new typeorm_1.TableIndex({
            name: 'IDX_team_members_user',
            columnNames: ['user_id'],
        }));
        // Add foreign keys
        await queryRunner.createForeignKey('team_members', new typeorm_1.TableForeignKey({
            name: 'FK_team_members_team',
            columnNames: ['team_id'],
            referencedTableName: 'teams',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
        }));
        await queryRunner.createForeignKey('team_members', new typeorm_1.TableForeignKey({
            name: 'FK_team_members_user',
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
        }));
        // Create team_channel_accounts table
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'team_channel_accounts',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    generationStrategy: 'uuid',
                    default: 'uuid_generate_v4()',
                },
                {
                    name: 'team_id',
                    type: 'uuid',
                    isNullable: false,
                },
                {
                    name: 'channel_account_id',
                    type: 'uuid',
                    isNullable: false,
                },
                {
                    name: 'created_at',
                    type: 'timestamp with time zone',
                    default: 'CURRENT_TIMESTAMP',
                },
            ],
        }), true);
        // Add unique constraint for channel account per team
        await queryRunner.createIndex('team_channel_accounts', new typeorm_1.TableIndex({
            name: 'IDX_team_channel_accounts_team_channel_unique',
            columnNames: ['team_id', 'channel_account_id'],
            isUnique: true,
        }));
        // Add index for channel account lookup
        await queryRunner.createIndex('team_channel_accounts', new typeorm_1.TableIndex({
            name: 'IDX_team_channel_accounts_channel',
            columnNames: ['channel_account_id'],
        }));
        // Add foreign keys
        await queryRunner.createForeignKey('team_channel_accounts', new typeorm_1.TableForeignKey({
            name: 'FK_team_channel_accounts_team',
            columnNames: ['team_id'],
            referencedTableName: 'teams',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
        }));
        await queryRunner.createForeignKey('team_channel_accounts', new typeorm_1.TableForeignKey({
            name: 'FK_team_channel_accounts_channel_account',
            columnNames: ['channel_account_id'],
            referencedTableName: 'channel_accounts',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
        }));
    }
    async down(queryRunner) {
        // Drop foreign keys first
        await queryRunner.dropForeignKey('team_channel_accounts', 'FK_team_channel_accounts_channel_account');
        await queryRunner.dropForeignKey('team_channel_accounts', 'FK_team_channel_accounts_team');
        await queryRunner.dropForeignKey('team_members', 'FK_team_members_user');
        await queryRunner.dropForeignKey('team_members', 'FK_team_members_team');
        await queryRunner.dropForeignKey('teams', 'FK_teams_tenant');
        // Drop tables
        await queryRunner.dropTable('team_channel_accounts');
        await queryRunner.dropTable('team_members');
        await queryRunner.dropTable('teams');
        // Drop enum
        await queryRunner.query('DROP TYPE IF EXISTS team_member_role');
    }
}
exports.CreateTeamTables1733500100000 = CreateTeamTables1733500100000;
