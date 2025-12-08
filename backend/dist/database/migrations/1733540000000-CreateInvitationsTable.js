"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateInvitationsTable1733540000000 = void 0;
const typeorm_1 = require("typeorm");
class CreateInvitationsTable1733540000000 {
    name = 'CreateInvitationsTable1733540000000';
    async up(queryRunner) {
        // Create invitation status enum
        await queryRunner.query(`
      CREATE TYPE "invitation_status_enum" AS ENUM ('pending', 'accepted', 'declined', 'expired')
    `);
        // Create invitations table
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'invitations',
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
                    name: 'email',
                    type: 'varchar',
                    length: '255',
                    isNullable: false,
                },
                {
                    name: 'inviter_id',
                    type: 'uuid',
                    isNullable: false,
                },
                {
                    name: 'token_hash',
                    type: 'varchar',
                    length: '64',
                    isNullable: false,
                },
                {
                    name: 'status',
                    type: 'invitation_status_enum',
                    default: "'pending'",
                },
                {
                    name: 'expires_at',
                    type: 'timestamp',
                    isNullable: false,
                },
                {
                    name: 'accepted_at',
                    type: 'timestamp',
                    isNullable: true,
                },
                {
                    name: 'created_at',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                },
                {
                    name: 'updated_at',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                },
            ],
        }), true);
        // Add unique constraint for tenant_id + email
        await queryRunner.createUniqueConstraint('invitations', new typeorm_1.TableUnique({
            name: 'UQ_invitations_tenant_email',
            columnNames: ['tenant_id', 'email'],
        }));
        // Add indexes
        await queryRunner.createIndex('invitations', new typeorm_1.TableIndex({
            name: 'IDX_invitations_tenant_id',
            columnNames: ['tenant_id'],
        }));
        await queryRunner.createIndex('invitations', new typeorm_1.TableIndex({
            name: 'IDX_invitations_email',
            columnNames: ['email'],
        }));
        await queryRunner.createIndex('invitations', new typeorm_1.TableIndex({
            name: 'IDX_invitations_token_hash',
            columnNames: ['token_hash'],
        }));
        await queryRunner.createIndex('invitations', new typeorm_1.TableIndex({
            name: 'IDX_invitations_status',
            columnNames: ['status'],
        }));
        await queryRunner.createIndex('invitations', new typeorm_1.TableIndex({
            name: 'IDX_invitations_expires_at',
            columnNames: ['expires_at'],
        }));
        // Add foreign keys
        await queryRunner.createForeignKey('invitations', new typeorm_1.TableForeignKey({
            name: 'FK_invitations_tenant',
            columnNames: ['tenant_id'],
            referencedTableName: 'tenants',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
        }));
        await queryRunner.createForeignKey('invitations', new typeorm_1.TableForeignKey({
            name: 'FK_invitations_inviter',
            columnNames: ['inviter_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
        }));
    }
    async down(queryRunner) {
        // Drop foreign keys
        await queryRunner.dropForeignKey('invitations', 'FK_invitations_inviter');
        await queryRunner.dropForeignKey('invitations', 'FK_invitations_tenant');
        // Drop indexes
        await queryRunner.dropIndex('invitations', 'IDX_invitations_expires_at');
        await queryRunner.dropIndex('invitations', 'IDX_invitations_status');
        await queryRunner.dropIndex('invitations', 'IDX_invitations_token_hash');
        await queryRunner.dropIndex('invitations', 'IDX_invitations_email');
        await queryRunner.dropIndex('invitations', 'IDX_invitations_tenant_id');
        // Drop unique constraint
        await queryRunner.dropUniqueConstraint('invitations', 'UQ_invitations_tenant_email');
        // Drop table
        await queryRunner.dropTable('invitations');
        // Drop enum
        await queryRunner.query('DROP TYPE "invitation_status_enum"');
    }
}
exports.CreateInvitationsTable1733540000000 = CreateInvitationsTable1733540000000;
