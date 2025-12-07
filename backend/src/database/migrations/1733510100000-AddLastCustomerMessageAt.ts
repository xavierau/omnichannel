import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add last_customer_message_at column to conversations table.
 *
 * This column tracks when the last inbound (customer) message was received,
 * which is required for WhatsApp Cloud API 24-hour messaging window compliance.
 *
 * WhatsApp requires that businesses can only send freeform messages within
 * 24 hours of the last customer message. After 24 hours, only pre-approved
 * template messages can be sent.
 *
 * @see https://developers.facebook.com/docs/whatsapp/conversation-types
 */
export class AddLastCustomerMessageAt1733510100000 implements MigrationInterface {
  name = 'AddLastCustomerMessageAt1733510100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the last_customer_message_at column
    await queryRunner.query(`
      ALTER TABLE "conversations"
      ADD COLUMN "last_customer_message_at" timestamp with time zone NULL
    `);

    // Create index for efficient querying of messaging window status
    // This index supports queries that filter or sort by last customer message timestamp
    await queryRunner.query(`
      CREATE INDEX "IDX_conversations_last_customer_message_at"
      ON "conversations" ("last_customer_message_at")
      WHERE "last_customer_message_at" IS NOT NULL
    `);

    // Create composite index for tenant-scoped queries checking window status
    await queryRunner.query(`
      CREATE INDEX "IDX_conversations_tenant_last_customer_message"
      ON "conversations" ("tenant_id", "last_customer_message_at" DESC)
      WHERE "last_customer_message_at" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_conversations_tenant_last_customer_message"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_conversations_last_customer_message_at"`);

    // Drop the column
    await queryRunner.query(`
      ALTER TABLE "conversations"
      DROP COLUMN "last_customer_message_at"
    `);
  }
}
