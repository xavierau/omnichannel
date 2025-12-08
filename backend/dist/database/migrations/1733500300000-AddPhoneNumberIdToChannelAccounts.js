"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddPhoneNumberIdToChannelAccounts1733500300000 = void 0;
const typeorm_1 = require("typeorm");
/**
 * Migration: Add phone_number_id column to channel_accounts table.
 *
 * This column stores the Meta phone_number_id for WhatsApp channel accounts,
 * enabling efficient lookup when receiving inbound webhook events.
 *
 * The phone_number_id is unique per provider (Meta) and is used to route
 * incoming messages to the correct channel account without needing to
 * decrypt credentials for every webhook.
 */
class AddPhoneNumberIdToChannelAccounts1733500300000 {
    async up(queryRunner) {
        // Add phone_number_id column
        await queryRunner.addColumn('channel_accounts', new typeorm_1.TableColumn({
            name: 'phone_number_id',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: 'Meta phone_number_id for WhatsApp accounts - used for webhook routing',
        }));
        // Create index for efficient lookup by phone_number_id
        // This is the primary lookup path for inbound webhook processing
        await queryRunner.createIndex('channel_accounts', new typeorm_1.TableIndex({
            name: 'IDX_channel_accounts_phone_number_id',
            columnNames: ['phone_number_id'],
            isUnique: false, // Not unique globally, but should be unique per active account
        }));
    }
    async down(queryRunner) {
        // Drop index first
        await queryRunner.dropIndex('channel_accounts', 'IDX_channel_accounts_phone_number_id');
        // Drop column
        await queryRunner.dropColumn('channel_accounts', 'phone_number_id');
    }
}
exports.AddPhoneNumberIdToChannelAccounts1733500300000 = AddPhoneNumberIdToChannelAccounts1733500300000;
