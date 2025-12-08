"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateTenantsAndCustomers1733400000000 = void 0;
class CreateTenantsAndCustomers1733400000000 {
    async up(queryRunner) {
        // 1. Create tenants table
        await queryRunner.query(`
      CREATE TABLE "tenants" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL,
        "slug" varchar(100) NOT NULL UNIQUE,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_tenants_slug" ON "tenants" ("slug")
    `);
        // 2. Add tenant_id to users table
        await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "tenant_id" uuid NULL REFERENCES "tenants"("id")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_users_tenant" ON "users" ("tenant_id")
    `);
        // 3. Create tags table
        await queryRunner.query(`
      CREATE TABLE "tags" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "name" varchar(100) NOT NULL,
        "color" varchar(20) NOT NULL DEFAULT 'gray' CHECK ("color" IN ('purple', 'blue', 'green', 'gray', 'yellow', 'orange', 'red', 'pink')),
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_tags_tenant" ON "tags" ("tenant_id")
    `);
        await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_tags_tenant_name" ON "tags" ("tenant_id", "name")
    `);
        // 4. Create customers table
        await queryRunner.query(`
      CREATE TABLE "customers" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "name" varchar(255) NOT NULL,
        "whatsapp_number" varchar(20) NOT NULL,
        "custom_fields" jsonb DEFAULT '{}',
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_customers_tenant" ON "customers" ("tenant_id")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_customers_whatsapp" ON "customers" ("whatsapp_number")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_customers_name" ON "customers" ("name")
    `);
        await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_customers_tenant_whatsapp" ON "customers" ("tenant_id", "whatsapp_number")
    `);
        // 5. Create customer_tags junction table
        await queryRunner.query(`
      CREATE TABLE "customer_tags" (
        "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
        "tag_id" uuid NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
        PRIMARY KEY ("customer_id", "tag_id")
      )
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_customer_tags_customer" ON "customer_tags" ("customer_id")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_customer_tags_tag" ON "customer_tags" ("tag_id")
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS "customer_tags"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "customers"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "tags"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_tenant"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "tenant_id"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "tenants"`);
    }
}
exports.CreateTenantsAndCustomers1733400000000 = CreateTenantsAndCustomers1733400000000;
