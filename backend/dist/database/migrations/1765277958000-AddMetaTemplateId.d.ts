import { MigrationInterface, QueryRunner } from 'typeorm';
/**
 * Migration to add meta_template_id column to template_translations table.
 *
 * This field stores the ID that Meta assigns to templates when they are
 * submitted to the WhatsApp Business API. The ID is needed for sending
 * template messages and tracking template status.
 *
 * Uses a partial index to only index non-null values since most templates
 * will initially have a null meta_template_id until submitted to Meta.
 */
export declare class AddMetaTemplateId1765277958000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
