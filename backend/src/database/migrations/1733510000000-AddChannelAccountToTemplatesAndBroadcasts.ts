import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add channel_account_id to templates and broadcasts.
 *
 * This links templates and broadcasts to specific channel accounts,
 * supporting the multi-provider architecture where each tenant can have
 * multiple WhatsApp numbers with different providers.
 */
export class AddChannelAccountToTemplatesAndBroadcasts1733510000000
  implements MigrationInterface
{
  name = 'AddChannelAccountToTemplatesAndBroadcasts1733510000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add channel_account_id to whatsapp_template_groups
    await queryRunner.query(`
      ALTER TABLE "whatsapp_template_groups"
      ADD COLUMN "channel_account_id" uuid
    `);

    // Add index for channel_account_id on templates
    await queryRunner.query(`
      CREATE INDEX "IDX_template_groups_channel_account"
      ON "whatsapp_template_groups" ("channel_account_id")
    `);

    // Add foreign key constraint to channel_accounts
    await queryRunner.query(`
      ALTER TABLE "whatsapp_template_groups"
      ADD CONSTRAINT "FK_template_groups_channel_account"
      FOREIGN KEY ("channel_account_id")
      REFERENCES "channel_accounts" ("id")
      ON DELETE SET NULL
    `);

    // Add channel_account_id to broadcasts (if not exists)
    await queryRunner.query(`
      ALTER TABLE "broadcasts"
      ADD COLUMN IF NOT EXISTS "channel_account_id" uuid
    `);

    // Add index for channel_account_id on broadcasts (if not exists)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_broadcasts_channel_account"
      ON "broadcasts" ("channel_account_id")
    `);

    // Add foreign key constraint to channel_accounts (check if exists first)
    const fkExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'FK_broadcasts_channel_account'
      AND table_name = 'broadcasts'
    `);
    if (!fkExists || fkExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "broadcasts"
        ADD CONSTRAINT "FK_broadcasts_channel_account"
        FOREIGN KEY ("channel_account_id")
        REFERENCES "channel_accounts" ("id")
        ON DELETE SET NULL
      `);
    }

    // Update unique constraint on template_groups to include channel_account_id
    // First drop the existing unique constraint
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_whatsapp_template_groups_tenant_id_name"
    `);

    // Create new unique constraint including channel_account_id
    // Template names must be unique per tenant AND channel account
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_template_groups_tenant_channel_name"
      ON "whatsapp_template_groups" ("tenant_id", "channel_account_id", "name")
      WHERE "channel_account_id" IS NOT NULL
    `);

    // Keep a constraint for templates without channel_account_id (legacy)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_template_groups_tenant_name_legacy"
      ON "whatsapp_template_groups" ("tenant_id", "name")
      WHERE "channel_account_id" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove unique constraints
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_template_groups_tenant_channel_name"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_template_groups_tenant_name_legacy"
    `);

    // Restore original unique constraint
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_whatsapp_template_groups_tenant_id_name"
      ON "whatsapp_template_groups" ("tenant_id", "name")
    `);

    // Remove foreign key and column from broadcasts
    await queryRunner.query(`
      ALTER TABLE "broadcasts"
      DROP CONSTRAINT IF EXISTS "FK_broadcasts_channel_account"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_broadcasts_channel_account"
    `);

    await queryRunner.query(`
      ALTER TABLE "broadcasts"
      DROP COLUMN IF EXISTS "channel_account_id"
    `);

    // Remove foreign key and column from template_groups
    await queryRunner.query(`
      ALTER TABLE "whatsapp_template_groups"
      DROP CONSTRAINT IF EXISTS "FK_template_groups_channel_account"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_template_groups_channel_account"
    `);

    await queryRunner.query(`
      ALTER TABLE "whatsapp_template_groups"
      DROP COLUMN IF EXISTS "channel_account_id"
    `);
  }
}
