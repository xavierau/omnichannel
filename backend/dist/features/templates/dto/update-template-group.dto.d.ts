import { TemplateCategory } from '../enums';
/**
 * DTO for updating a WhatsApp template group.
 * All fields are optional - only provided fields will be updated.
 */
export declare class UpdateTemplateGroupDto {
    name?: string;
    category?: TemplateCategory;
    customFields?: Record<string, unknown>;
}
