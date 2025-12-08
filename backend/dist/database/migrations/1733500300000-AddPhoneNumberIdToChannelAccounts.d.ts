import { MigrationInterface, QueryRunner } from 'typeorm';
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
export declare class AddPhoneNumberIdToChannelAccounts1733500300000 implements MigrationInterface {
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
