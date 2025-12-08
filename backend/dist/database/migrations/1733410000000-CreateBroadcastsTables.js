"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateBroadcastsTables1733410000000 = void 0;
class CreateBroadcastsTables1733410000000 {
    async up(queryRunner) {
        // 1. Create template_category enum
        await queryRunner.query(`
      CREATE TYPE "template_category_enum" AS ENUM ('marketing', 'utility', 'authentication')
    `);
        // 2. Create template_status enum
        await queryRunner.query(`
      CREATE TYPE "template_status_enum" AS ENUM ('approved', 'pending', 'rejected')
    `);
        // 3. Create template_quality enum
        await queryRunner.query(`
      CREATE TYPE "template_quality_enum" AS ENUM ('high', 'medium', 'low', 'pending')
    `);
        // 4. Create header_type enum
        await queryRunner.query(`
      CREATE TYPE "header_type_enum" AS ENUM ('text', 'image', 'video', 'document', 'none')
    `);
        // 5. Create broadcast_status enum
        await queryRunner.query(`
      CREATE TYPE "broadcast_status_enum" AS ENUM ('draft', 'scheduled', 'sending', 'completed', 'paused', 'cancelled', 'failed')
    `);
        // 6. Create recipient_type enum
        await queryRunner.query(`
      CREATE TYPE "recipient_type_enum" AS ENUM ('group', 'customers')
    `);
        // 7. Create media_type enum
        await queryRunner.query(`
      CREATE TYPE "media_type_enum" AS ENUM ('image', 'video', 'document')
    `);
        // 8. Create whatsapp_template_groups table
        await queryRunner.query(`
      CREATE TABLE "whatsapp_template_groups" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "name" varchar(255) NOT NULL,
        "category" template_category_enum NOT NULL,
        "custom_fields" jsonb DEFAULT '{}',
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_template_groups_tenant" ON "whatsapp_template_groups" ("tenant_id")
    `);
        await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_template_groups_tenant_name" ON "whatsapp_template_groups" ("tenant_id", "name")
    `);
        // 9. Create template_translations table
        await queryRunner.query(`
      CREATE TABLE "template_translations" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "template_group_id" uuid NOT NULL REFERENCES "whatsapp_template_groups"("id") ON DELETE CASCADE,
        "language" varchar(10) NOT NULL,
        "status" template_status_enum NOT NULL DEFAULT 'pending',
        "quality" template_quality_enum NULL,
        "header_type" header_type_enum NULL,
        "header_content" text NULL,
        "body" text NOT NULL,
        "footer" text NULL,
        "buttons" jsonb NOT NULL DEFAULT '[]',
        "rejection_reason" text NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_template_translations_group" ON "template_translations" ("template_group_id")
    `);
        await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_template_translations_group_language" ON "template_translations" ("template_group_id", "language")
    `);
        // 10. Create customer_groups table
        await queryRunner.query(`
      CREATE TABLE "customer_groups" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "name" varchar(255) NOT NULL,
        "description" text NULL,
        "is_static" boolean NOT NULL DEFAULT false,
        "member_ids" jsonb NULL,
        "criteria" jsonb NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_customer_groups_tenant" ON "customer_groups" ("tenant_id")
    `);
        await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_customer_groups_tenant_name" ON "customer_groups" ("tenant_id", "name")
    `);
        // 11. Create broadcasts table
        await queryRunner.query(`
      CREATE TABLE "broadcasts" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "name" varchar(255) NOT NULL,
        "description" text NULL,
        "template_id" uuid NOT NULL REFERENCES "whatsapp_template_groups"("id") ON DELETE SET NULL,
        "template_name" varchar(255) NOT NULL,
        "template_category" template_category_enum NOT NULL,
        "template_language" varchar(10) NOT NULL,
        "recipient_type" recipient_type_enum NOT NULL,
        "group_id" uuid NULL REFERENCES "customer_groups"("id") ON DELETE SET NULL,
        "customer_ids" jsonb NULL,
        "total_recipients" integer NOT NULL DEFAULT 0,
        "template_variables" jsonb NOT NULL,
        "scheduled_at" timestamp with time zone NULL,
        "is_immediate" boolean NOT NULL DEFAULT false,
        "timezone" varchar(50) NOT NULL DEFAULT 'UTC',
        "status" broadcast_status_enum NOT NULL DEFAULT 'draft',
        "sent_count" integer NOT NULL DEFAULT 0,
        "delivered_count" integer NOT NULL DEFAULT 0,
        "read_count" integer NOT NULL DEFAULT 0,
        "failed_count" integer NOT NULL DEFAULT 0,
        "created_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "completed_at" timestamp with time zone NULL,
        "custom_fields" jsonb DEFAULT '{}'
      )
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_broadcasts_tenant" ON "broadcasts" ("tenant_id")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_broadcasts_tenant_status" ON "broadcasts" ("tenant_id", "status")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_broadcasts_tenant_scheduled" ON "broadcasts" ("tenant_id", "scheduled_at")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_broadcasts_template" ON "broadcasts" ("template_id")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_broadcasts_created_by" ON "broadcasts" ("created_by")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_broadcasts_status" ON "broadcasts" ("status")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_broadcasts_scheduled_at" ON "broadcasts" ("scheduled_at")
    `);
        // 12. Create media table
        await queryRunner.query(`
      CREATE TABLE "media" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "type" media_type_enum NOT NULL,
        "original_name" varchar(255) NOT NULL,
        "mime_type" varchar(100) NOT NULL,
        "file_size" integer NOT NULL,
        "s3_key" varchar(500) NOT NULL,
        "s3_bucket" varchar(100) NOT NULL,
        "uploaded_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_media_tenant" ON "media" ("tenant_id")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_media_tenant_type" ON "media" ("tenant_id", "type")
    `);
    }
    async down(queryRunner) {
        // Drop tables in reverse order
        await queryRunner.query(`DROP TABLE IF EXISTS "media"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "broadcasts"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "customer_groups"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "template_translations"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "whatsapp_template_groups"`);
        // Drop enums
        await queryRunner.query(`DROP TYPE IF EXISTS "media_type_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "recipient_type_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "broadcast_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "header_type_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "template_quality_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "template_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "template_category_enum"`);
    }
}
exports.CreateBroadcastsTables1733410000000 = CreateBroadcastsTables1733410000000;
