import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1733337600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "email" varchar NOT NULL UNIQUE,
        "password_hash" varchar NOT NULL,
        "first_name" varchar NOT NULL,
        "last_name" varchar NOT NULL,
        "status" varchar NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'inactive', 'suspended')),
        "email_verified" boolean NOT NULL DEFAULT false,
        "last_login_at" timestamp NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Create roles table
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL UNIQUE,
        "display_name" varchar NOT NULL,
        "description" text NULL,
        "level" integer NOT NULL,
        "is_system" boolean NOT NULL DEFAULT false,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_role_level" CHECK ("level" >= 1 AND "level" <= 4)
      )
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "roles"."level" IS '1=super_admin, 2=admin, 3=manager, 4=agent'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "roles"."is_system" IS 'System roles cannot be deleted'
    `);

    // Create permissions table
    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "resource" varchar NOT NULL CHECK ("resource" IN (
          'broadcasts', 'customers', 'templates', 'conversations',
          'users', 'settings', 'api_keys', 'channels', 'custom_fields', 'notes'
        )),
        "action" varchar NOT NULL CHECK ("action" IN ('create', 'read', 'update', 'delete', 'manage')),
        "scope" varchar NOT NULL CHECK ("scope" IN ('all', 'own')),
        "description" text NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_permission" UNIQUE ("resource", "action", "scope")
      )
    `);

    // Create user_roles junction table
    await queryRunner.query(`
      CREATE TABLE "user_roles" (
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
        PRIMARY KEY ("user_id", "role_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_roles_user" ON "user_roles" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_roles_role" ON "user_roles" ("role_id")
    `);

    // Create role_permissions junction table
    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
        "permission_id" uuid NOT NULL REFERENCES "permissions"("id") ON DELETE CASCADE,
        PRIMARY KEY ("role_id", "permission_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_role_permissions_role" ON "role_permissions" ("role_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_role_permissions_permission" ON "role_permissions" ("permission_id")
    `);

    // Create refresh_tokens table
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" varchar NOT NULL,
        "expires_at" timestamp NOT NULL,
        "revoked" boolean NOT NULL DEFAULT false,
        "ip_address" varchar NULL,
        "user_agent" text NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_refresh_tokens_user" ON "refresh_tokens" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP TABLE "user_roles"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
