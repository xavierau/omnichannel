import { MigrationInterface, QueryRunner } from 'typeorm';
/**
 * Migration to add last_customer_message_at column to conversations table.
 *
 * This column tracks when the last inbound (customer) message was received,
 * which is required for WhatsApp Cloud API 24-hour messaging window compliance.
 *
 * WhatsApp requires that businesses can only send freeform messages within
 * 24 hours of the last customer message. After 24 hours, only pre-approved
 * template messages can be sent.
 *
 * @see https://developers.facebook.com/docs/whatsapp/conversation-types
 */
export declare class AddLastCustomerMessageAt1733510100000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
