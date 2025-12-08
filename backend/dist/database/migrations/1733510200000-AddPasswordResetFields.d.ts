import { MigrationInterface, QueryRunner } from 'typeorm';
/**
 * Migration to add password reset token fields to users table.
 *
 * Password reset tokens are stored directly on the user entity rather than
 * in a separate table for simplicity and to ensure atomicity of token
 * invalidation when password is changed.
 */
export declare class AddPasswordResetFields1733510200000 implements MigrationInterface {
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
