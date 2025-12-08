"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddBroadcastActionColumns1733420000000 = void 0;
class AddBroadcastActionColumns1733420000000 {
    async up(queryRunner) {
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
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "broadcasts" DROP COLUMN IF EXISTS "previous_status"
    `);
        await queryRunner.query(`
      ALTER TABLE "broadcasts" DROP COLUMN IF EXISTS "started_at"
    `);
    }
}
exports.AddBroadcastActionColumns1733420000000 = AddBroadcastActionColumns1733420000000;
