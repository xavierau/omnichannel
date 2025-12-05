import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProviderInfrastructure1733500000000 implements MigrationInterface {
  name = 'CreateProviderInfrastructure1733500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create channel_account_status enum
    await queryRunner.query(`
      CREATE TYPE "channel_account_status_enum" AS ENUM (
        'connected', 'disconnected', 'error'
      )
    `);

    // 2. Create message_status enum
    await queryRunner.query(`
      CREATE TYPE "message_status_enum" AS ENUM (
        'pending', 'queued', 'sent', 'delivered', 'read', 'failed'
      )
    `);

    // 3. Create channels table
    await queryRunner.query(`
      CREATE TABLE "channels" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "code" varchar(50) NOT NULL,
        "name" varchar(100) NOT NULL,
        "description" text NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "required_customer_fields" jsonb NOT NULL DEFAULT '[]',
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_channels_code" ON "channels" ("code")
    `);

    // 4. Create providers table
    await queryRunner.query(`
      CREATE TABLE "providers" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "channel_id" uuid NOT NULL REFERENCES "channels"("id") ON DELETE CASCADE,
        "code" varchar(50) NOT NULL,
        "name" varchar(100) NOT NULL,
        "description" text NULL,
        "config_schema" jsonb NOT NULL,
        "webhook_config" jsonb NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "supports_templates" boolean NOT NULL DEFAULT true,
        "rate_limits" jsonb NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_providers_code" ON "providers" ("code")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_providers_channel" ON "providers" ("channel_id")
    `);

    // 5. Create channel_accounts table
    await queryRunner.query(`
      CREATE TABLE "channel_accounts" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "channel_id" uuid NOT NULL REFERENCES "channels"("id") ON DELETE CASCADE,
        "provider_id" uuid NOT NULL REFERENCES "providers"("id") ON DELETE CASCADE,
        "name" varchar(255) NOT NULL,
        "phone_number" varchar(50) NULL,
        "encrypted_credentials" text NOT NULL,
        "credentials_iv" text NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "is_primary" boolean NOT NULL DEFAULT false,
        "status" channel_account_status_enum NOT NULL DEFAULT 'disconnected',
        "last_tested_at" timestamp with time zone NULL,
        "error_message" text NULL,
        "webhook_url" varchar(500) NULL,
        "webhook_secret_encrypted" text NULL,
        "webhook_secret_iv" text NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_channel_accounts_tenant" ON "channel_accounts" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_channel_accounts_tenant_channel" ON "channel_accounts" ("tenant_id", "channel_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_channel_accounts_tenant_primary" ON "channel_accounts" ("tenant_id", "is_primary")
    `);

    // 6. Create message_logs table
    await queryRunner.query(`
      CREATE TABLE "message_logs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "broadcast_id" uuid NULL REFERENCES "broadcasts"("id") ON DELETE SET NULL,
        "customer_id" uuid NULL REFERENCES "customers"("id") ON DELETE SET NULL,
        "channel_account_id" uuid NULL REFERENCES "channel_accounts"("id") ON DELETE SET NULL,
        "channel_id" uuid NOT NULL REFERENCES "channels"("id"),
        "provider_id" uuid NOT NULL REFERENCES "providers"("id"),
        "recipient" varchar(255) NOT NULL,
        "status" message_status_enum NOT NULL DEFAULT 'pending',
        "provider_message_id" varchar(255) NULL,
        "template_data" jsonb NULL,
        "error_message" text NULL,
        "error_code" varchar(50) NULL,
        "provider_response" jsonb NULL,
        "sent_at" timestamp with time zone NULL,
        "delivered_at" timestamp with time zone NULL,
        "read_at" timestamp with time zone NULL,
        "failed_at" timestamp with time zone NULL,
        "retry_count" integer NOT NULL DEFAULT 0,
        "used_fallback" boolean NOT NULL DEFAULT false,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_message_logs_tenant_broadcast" ON "message_logs" ("tenant_id", "broadcast_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_message_logs_tenant_created" ON "message_logs" ("tenant_id", "created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_message_logs_provider_message_id" ON "message_logs" ("provider_message_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_message_logs_status" ON "message_logs" ("status")
    `);

    // 7. Add channel_account_id to broadcasts table
    await queryRunner.query(`
      ALTER TABLE "broadcasts"
      ADD COLUMN "channel_account_id" uuid NULL REFERENCES "channel_accounts"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_broadcasts_channel_account" ON "broadcasts" ("channel_account_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes and columns in reverse order
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_broadcasts_channel_account"`);
    await queryRunner.query(`ALTER TABLE "broadcasts" DROP COLUMN IF EXISTS "channel_account_id"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_message_logs_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_message_logs_provider_message_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_message_logs_tenant_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_message_logs_tenant_broadcast"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "message_logs"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_channel_accounts_tenant_primary"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_channel_accounts_tenant_channel"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_channel_accounts_tenant"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "channel_accounts"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_providers_channel"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_providers_code"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "providers"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_channels_code"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "channels"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "message_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "channel_account_status_enum"`);
  }
}
