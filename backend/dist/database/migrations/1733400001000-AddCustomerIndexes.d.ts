import { MigrationInterface, QueryRunner } from 'typeorm';
/**
 * Migration to add performance-related indexes for customer queries.
 *
 * This migration adds a composite index on (tenant_id, created_at) to optimize
 * date range queries that are filtered by tenant, which is a common query pattern.
 */
export declare class AddCustomerIndexes1733400001000 implements MigrationInterface {
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
