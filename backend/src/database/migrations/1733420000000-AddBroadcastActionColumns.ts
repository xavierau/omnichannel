import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBroadcastActionColumns1733420000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add started_at column for tracking when broadcast started sending
    await queryRunner.query(`
      ALTER TABLE "broadcasts"
      ADD COLUMN "started_at" timestamp with time zone NULL
    `);

    // Add previous_status column for resume functionality
    await queryRunner.query(`
      ALTER TABLE "broadcasts"
      ADD COLUMN "previous_status" broadcast_status_enum NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "broadcasts" DROP COLUMN IF EXISTS "previous_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "broadcasts" DROP COLUMN IF EXISTS "started_at"
    `);
  }
}
