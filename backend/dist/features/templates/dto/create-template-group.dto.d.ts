import { TemplateCategory } from '../enums';
/**
 * DTO for creating a new WhatsApp template group.
 * A template group contains translations of the same template in different languages.
 */
export declare class CreateTemplateGroupDto {
    name: string;
    category: TemplateCategory;
    /**
     * Channel account this template belongs to.
     * Templates are approved per WABA (WhatsApp Business Account).
     */
    channelAccountId?: string;
    customFields?: Record<string, unknown>;
}
