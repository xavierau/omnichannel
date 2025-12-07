import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCustomFieldsTable1733530000000 implements MigrationInterface {
  name = 'CreateCustomFieldsTable1733530000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create custom_field_entity_type enum
    await queryRunner.query(`
      CREATE TYPE "custom_field_entity_type_enum" AS ENUM (
        'CUSTOMER', 'BROADCAST', 'TEMPLATE', 'CONVERSATION'
      )
    `);

    // 2. Create custom_field_type enum
    await queryRunner.query(`
      CREATE TYPE "custom_field_type_enum" AS ENUM (
        'TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'DATETIME',
        'SELECT', 'MULTISELECT', 'BOOLEAN', 'PHONE', 'EMAIL', 'URL'
      )
    `);

    // 3. Create custom_field_definitions table
    await queryRunner.query(`
      CREATE TABLE "custom_field_definitions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "entity_type" custom_field_entity_type_enum NOT NULL,
        "field_key" varchar(100) NOT NULL,
        "display_label" varchar(255) NOT NULL,
        "description" text NULL,
        "field_type" custom_field_type_enum NOT NULL,
        "validation" jsonb NOT NULL DEFAULT '{}',
        "default_value" jsonb NULL,
        "options" jsonb NULL,
        "display_order" integer NOT NULL DEFAULT 0,
        "is_visible" boolean NOT NULL DEFAULT true,
        "is_searchable" boolean NOT NULL DEFAULT false,
        "is_filterable" boolean NOT NULL DEFAULT false,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    // 4. Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_custom_field_definitions_tenant"
      ON "custom_field_definitions" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_custom_field_definitions_entity_type"
      ON "custom_field_definitions" ("entity_type")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_custom_field_definitions_tenant_entity_type"
      ON "custom_field_definitions" ("tenant_id", "entity_type")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_custom_field_definitions_tenant_entity_key"
      ON "custom_field_definitions" ("tenant_id", "entity_type", "field_key")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_custom_field_definitions_tenant_entity_key"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_custom_field_definitions_tenant_entity_type"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_custom_field_definitions_entity_type"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_custom_field_definitions_tenant"
    `);

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "custom_field_definitions"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "custom_field_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "custom_field_entity_type_enum"`);
  }
}
