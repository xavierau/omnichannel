"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddCustomerIndexes1733400001000 = void 0;
/**
 * Migration to add performance-related indexes for customer queries.
 *
 * This migration adds a composite index on (tenant_id, created_at) to optimize
 * date range queries that are filtered by tenant, which is a common query pattern.
 */
class AddCustomerIndexes1733400001000 {
    async up(queryRunner) {
        // Add composite index for tenant_id + created_at
        // This optimizes date range queries filtered by tenant
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_customers_tenant_created"
      ON "customers" ("tenant_id", "created_at" DESC)
    `);
        // Add composite index for tenant_id + updated_at
        // This optimizes sorting by updated_at filtered by tenant
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_customers_tenant_updated"
      ON "customers" ("tenant_id", "updated_at" DESC)
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_customers_tenant_updated"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_customers_tenant_created"`);
    }
}
exports.AddCustomerIndexes1733400001000 = AddCustomerIndexes1733400001000;
