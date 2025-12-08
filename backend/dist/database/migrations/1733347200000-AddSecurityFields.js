"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddSecurityFields1733347200000 = void 0;
const typeorm_1 = require("typeorm");
class AddSecurityFields1733347200000 {
    async up(queryRunner) {
        // Add account lockout fields to users table
        await queryRunner.addColumn('users', new typeorm_1.TableColumn({
            name: 'failed_login_attempts',
            type: 'integer',
            default: 0,
        }));
        await queryRunner.addColumn('users', new typeorm_1.TableColumn({
            name: 'locked_until',
            type: 'timestamp',
            isNullable: true,
        }));
        // Add index on status column for frequent queries
        await queryRunner.createIndex('users', new typeorm_1.TableIndex({
            name: 'IDX_users_status',
            columnNames: ['status'],
        }));
        // Delete existing refresh tokens (they'll be regenerated on next login)
        await queryRunner.query('DELETE FROM refresh_tokens');
        // Add token_id and token_secret_hash to refresh_tokens table
        await queryRunner.addColumn('refresh_tokens', new typeorm_1.TableColumn({
            name: 'token_id',
            type: 'varchar',
            isNullable: false,
        }));
        await queryRunner.addColumn('refresh_tokens', new typeorm_1.TableColumn({
            name: 'token_secret_hash',
            type: 'varchar',
            isNullable: false,
        }));
        // Drop old token_hash column
        await queryRunner.dropColumn('refresh_tokens', 'token_hash');
        // Add composite index on user_id and revoked
        await queryRunner.createIndex('refresh_tokens', new typeorm_1.TableIndex({
            name: 'IDX_refresh_tokens_user_id_revoked',
            columnNames: ['user_id', 'revoked'],
        }));
        // Add unique index on token_id
        await queryRunner.createIndex('refresh_tokens', new typeorm_1.TableIndex({
            name: 'IDX_refresh_tokens_token_id',
            columnNames: ['token_id'],
            isUnique: true,
        }));
    }
    async down(queryRunner) {
        // Drop indexes
        await queryRunner.dropIndex('refresh_tokens', 'IDX_refresh_tokens_token_id');
        await queryRunner.dropIndex('refresh_tokens', 'IDX_refresh_tokens_user_id_revoked');
        await queryRunner.dropIndex('users', 'IDX_users_status');
        // Restore token_hash column
        await queryRunner.addColumn('refresh_tokens', new typeorm_1.TableColumn({
            name: 'token_hash',
            type: 'varchar',
            isNullable: false,
        }));
        // Drop new columns from refresh_tokens
        await queryRunner.dropColumn('refresh_tokens', 'token_secret_hash');
        await queryRunner.dropColumn('refresh_tokens', 'token_id');
        // Drop columns from users
        await queryRunner.dropColumn('users', 'locked_until');
        await queryRunner.dropColumn('users', 'failed_login_attempts');
    }
}
exports.AddSecurityFields1733347200000 = AddSecurityFields1733347200000;
