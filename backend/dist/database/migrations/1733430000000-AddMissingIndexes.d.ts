import { MigrationInterface, QueryRunner } from 'typeorm';
/**
 * Migration to add missing indexes for performance optimization.
 *
 * These indexes improve query performance for:
 * - Template translation status filtering
 * - Broadcast date-based queries and sorting
 * - Customer group filtering by type (static/dynamic)
 * - Broadcast status filtering
 */
export declare class AddMissingIndexes1733430000000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
