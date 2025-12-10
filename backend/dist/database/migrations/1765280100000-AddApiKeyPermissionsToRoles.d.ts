import { MigrationInterface, QueryRunner } from 'typeorm';
/**
 * Migration to add API Keys resource permissions to roles.
 *
 * This migration:
 * 1. Inserts API key permission records for all action/scope combinations
 * 2. Assigns api_keys permissions to super_admin and admin roles
 */
export declare class AddApiKeyPermissionsToRoles1765280100000 implements MigrationInterface {
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
