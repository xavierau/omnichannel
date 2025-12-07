import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to create inbox-related tables for the omnichannel messaging platform.
 *
 * Tables created:
 * - conversations: Core conversation entity linking customers to channel accounts
 * - conversation_messages: Individual messages within conversations
 * - conversation_notes: Internal notes attached to conversations or customers
 * - conversation_assignments: Audit trail for conversation assignment changes
 *
 * Enums created:
 * - conversation_status: unassigned, active, waiting, resolved, closed
 * - message_direction: inbound, outbound
 * - message_content_type: text, image, video, audio, document, template, location, sticker
 * - message_delivery_status: pending, queued, sent, delivered, read, failed
 * - note_scope: conversation, customer
 * - assignment_action: assigned, released, transferred
 */
export class CreateInboxTables1733500200000 implements MigrationInterface {
  name = 'CreateInboxTables1733500200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create enums
    await queryRunner.query(`
      CREATE TYPE "conversation_status" AS ENUM (
        'unassigned', 'active', 'waiting', 'resolved', 'closed'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "message_direction" AS ENUM (
        'inbound', 'outbound'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "message_content_type" AS ENUM (
        'text', 'image', 'video', 'audio', 'document', 'template', 'location', 'sticker'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "message_delivery_status" AS ENUM (
        'pending', 'queued', 'sent', 'delivered', 'read', 'failed'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "note_scope" AS ENUM (
        'conversation', 'customer'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "assignment_action" AS ENUM (
        'assigned', 'released', 'transferred'
      )
    `);

    // 2. Create conversations table
    await queryRunner.query(`
      CREATE TABLE "conversations" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "customer_id" uuid NULL REFERENCES "customers"("id") ON DELETE SET NULL,
        "channel_account_id" uuid NOT NULL REFERENCES "channel_accounts"("id") ON DELETE CASCADE,
        "assigned_to_id" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "status" conversation_status NOT NULL DEFAULT 'unassigned',
        "last_message_at" timestamp with time zone NULL,
        "last_message_preview" varchar(255) NULL,
        "last_message_direction" message_direction NULL,
        "unread_count" integer NOT NULL DEFAULT 0,
        "metadata" jsonb NULL,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      )
    `);

    // Conversations indexes
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_conversations_tenant_customer_channel"
      ON "conversations" ("tenant_id", "customer_id", "channel_account_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_conversations_tenant_status"
      ON "conversations" ("tenant_id", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_conversations_tenant_assigned_to"
      ON "conversations" ("tenant_id", "assigned_to_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_conversations_tenant_channel_account"
      ON "conversations" ("tenant_id", "channel_account_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_conversations_tenant_last_message_at"
      ON "conversations" ("tenant_id", "last_message_at" DESC)
    `);

    // 3. Create conversation_messages table
    await queryRunner.query(`
      CREATE TABLE "conversation_messages" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "conversation_id" uuid NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
        "direction" message_direction NOT NULL,
        "content_type" message_content_type NOT NULL,
        "content" jsonb NOT NULL,
        "provider_message_id" varchar(255) NULL,
        "delivery_status" message_delivery_status NOT NULL DEFAULT 'pending',
        "sent_by_id" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "error_message" text NULL,
        "error_code" varchar(50) NULL,
        "retry_count" integer NOT NULL DEFAULT 0,
        "metadata" jsonb NULL,
        "sent_at" timestamp with time zone NULL,
        "delivered_at" timestamp with time zone NULL,
        "read_at" timestamp with time zone NULL,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      )
    `);

    // Conversation messages indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_conversation_messages_conversation_created"
      ON "conversation_messages" ("conversation_id", "created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_conversation_messages_provider_message_id"
      ON "conversation_messages" ("provider_message_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_conversation_messages_tenant_conversation_direction"
      ON "conversation_messages" ("tenant_id", "conversation_id", "direction")
    `);

    // 4. Create conversation_notes table
    await queryRunner.query(`
      CREATE TABLE "conversation_notes" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "conversation_id" uuid NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
        "customer_id" uuid NULL REFERENCES "customers"("id") ON DELETE SET NULL,
        "created_by_id" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "scope" note_scope NOT NULL DEFAULT 'conversation',
        "content" text NOT NULL,
        "mentions" jsonb NOT NULL DEFAULT '[]',
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      )
    `);

    // Conversation notes indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_conversation_notes_tenant_conversation"
      ON "conversation_notes" ("tenant_id", "conversation_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_conversation_notes_tenant_customer"
      ON "conversation_notes" ("tenant_id", "customer_id")
    `);

    // 5. Create conversation_assignments table
    await queryRunner.query(`
      CREATE TABLE "conversation_assignments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "conversation_id" uuid NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
        "from_user_id" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "to_user_id" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "action" assignment_action NOT NULL,
        "performed_by_id" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "reason" text NULL,
        "created_at" timestamp with time zone NOT NULL DEFAULT now()
      )
    `);

    // Conversation assignments indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_conversation_assignments_tenant_conversation_created"
      ON "conversation_assignments" ("tenant_id", "conversation_id", "created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting foreign key dependencies)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_conversation_assignments_tenant_conversation_created"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "conversation_assignments"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_conversation_notes_tenant_customer"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_conversation_notes_tenant_conversation"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "conversation_notes"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_conversation_messages_tenant_conversation_direction"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_conversation_messages_provider_message_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_conversation_messages_conversation_created"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "conversation_messages"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_conversations_tenant_last_message_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_conversations_tenant_channel_account"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_conversations_tenant_assigned_to"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_conversations_tenant_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_conversations_tenant_customer_channel"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "conversations"`);

    // Drop enums in reverse order
    await queryRunner.query(`DROP TYPE IF EXISTS "assignment_action"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "note_scope"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "message_delivery_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "message_content_type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "message_direction"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "conversation_status"`);
  }
}
