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
export class AddMissingIndexes1733430000000 implements MigrationInterface {
  name = 'AddMissingIndexes1733430000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Index for template translation status queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_template_translations_status"
      ON "template_translations" ("status")
    `);

    // Index for broadcast created_at queries (date filtering and sorting)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_broadcasts_created_at"
      ON "broadcasts" ("created_at")
    `);

    // Composite index for customer groups by tenant and type
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_customer_groups_tenant_is_static"
      ON "customer_groups" ("tenant_id", "is_static")
    `);

    // Index for broadcast status filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_broadcasts_status"
      ON "broadcasts" ("status")
    `);

    // Composite index for broadcasts by tenant and status (common query pattern)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_broadcasts_tenant_status"
      ON "broadcasts" ("tenant_id", "status")
    `);

    // Index for scheduled broadcasts lookup by scheduled_at
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_broadcasts_scheduled_at"
      ON "broadcasts" ("scheduled_at")
      WHERE "status" = 'scheduled'
    `);

    // Index for template category filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_broadcasts_template_category"
      ON "broadcasts" ("template_category")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_template_translations_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_broadcasts_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_customer_groups_tenant_is_static"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_broadcasts_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_broadcasts_tenant_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_broadcasts_scheduled_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_broadcasts_template_category"`);
  }
}
