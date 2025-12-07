import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

/**
 * Migration to add password reset token fields to users table.
 *
 * Password reset tokens are stored directly on the user entity rather than
 * in a separate table for simplicity and to ensure atomicity of token
 * invalidation when password is changed.
 */
export class AddPasswordResetFields1733510200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add password reset token field
    // Token is hashed with SHA256 for security
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'password_reset_token',
        type: 'varchar',
        length: '64', // SHA256 hash is 64 hex characters
        isNullable: true,
      })
    );

    // Add password reset expiry field
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'password_reset_expires',
        type: 'timestamp',
        isNullable: true,
      })
    );

    // Add index on password_reset_token for fast lookups
    // Token lookups need to be fast for the reset password endpoint
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_password_reset_token',
        columnNames: ['password_reset_token'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.dropIndex('users', 'IDX_users_password_reset_token');

    // Drop columns
    await queryRunner.dropColumn('users', 'password_reset_expires');
    await queryRunner.dropColumn('users', 'password_reset_token');
  }
}
