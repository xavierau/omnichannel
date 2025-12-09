"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddMetaTemplateId1765277958000 = void 0;
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
class AddMetaTemplateId1765277958000 {
    name = 'AddMetaTemplateId1765277958000';
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE template_translations
      ADD COLUMN meta_template_id VARCHAR(50) NULL
    `);
        await queryRunner.query(`
      CREATE INDEX IDX_template_translations_meta_template_id
      ON template_translations (meta_template_id)
      WHERE meta_template_id IS NOT NULL
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      DROP INDEX IF EXISTS IDX_template_translations_meta_template_id
    `);
        await queryRunner.query(`
      ALTER TABLE template_translations
      DROP COLUMN IF EXISTS meta_template_id
    `);
    }
}
exports.AddMetaTemplateId1765277958000 = AddMetaTemplateId1765277958000;
