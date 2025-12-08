import { MigrationInterface, QueryRunner } from 'typeorm';
/**
 * Migration to create inbox-related tables for the omnichannel messaging platform.
 *
 * Tables created:
 * - conversations: Core conversation entity linking customers to channel accounts
 * - conversation_messages: Individual messages within conversations
 * - conversation_notes: Internal notes attached to conversations or customers
 * - conversation_assignments: Audit trail for conversation assignment changes
 *
 * Enums created:
 * - conversation_status: unassigned, active, waiting, resolved, closed
 * - message_direction: inbound, outbound
 * - message_content_type: text, image, video, audio, document, template, location, sticker
 * - message_delivery_status: pending, queued, sent, delivered, read, failed
 * - note_scope: conversation, customer
 * - assignment_action: assigned, released, transferred
 */
export declare class CreateInboxTables1733500200000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
