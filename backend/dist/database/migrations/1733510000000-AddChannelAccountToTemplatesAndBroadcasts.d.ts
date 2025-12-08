import { MigrationInterface, QueryRunner } from 'typeorm';
/**
 * Migration to add channel_account_id to templates and broadcasts.
 *
 * This links templates and broadcasts to specific channel accounts,
 * supporting the multi-provider architecture where each tenant can have
 * multiple WhatsApp numbers with different providers.
 */
export declare class AddChannelAccountToTemplatesAndBroadcasts1733510000000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
