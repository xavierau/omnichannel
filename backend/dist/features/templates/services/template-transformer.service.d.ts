import { WhatsAppTemplateGroup } from '../template-group.entity';
import { TemplateTranslation } from '../template-translation.entity';
/**
 * Meta API category values.
 */
export type MetaCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
/**
 * Meta API header format values.
 */
export type MetaHeaderFormat = 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
/**
 * Meta API button type values.
 */
export type MetaButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE';
/**
 * Meta API component type values.
 */
export type MetaComponentType = 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
/**
 * Meta API button structure.
 */
export interface MetaButton {
    type: MetaButtonType;
    text: string;
    url?: string;
    phone_number?: string;
}
/**
 * Meta API component example structure.
 */
export interface MetaComponentExample {
    header_text?: string[];
    header_handle?: string[];
    body_text?: string[][];
}
/**
 * Meta API component structure.
 */
export interface MetaComponent {
    type: MetaComponentType;
    format?: MetaHeaderFormat;
    text?: string;
    buttons?: MetaButton[];
    example?: MetaComponentExample;
}
/**
 * Meta Graph API template request structure.
 */
export interface MetaTemplateRequest {
    name: string;
    language: string;
    category: MetaCategory;
    components: MetaComponent[];
}
/**
 * Service for transforming local template format to Meta's Graph API format.
 *
 * This service handles the conversion between our internal template representation
 * and the format required by Meta's WhatsApp Business API for template management.
 */
export declare class TemplateTransformerService {
    /**
     * Transform local template to Meta API format.
     *
     * @param group - The template group containing name and category
     * @param translation - The template translation with content and buttons
     * @returns The formatted request for Meta's Graph API
     */
    transformToMetaFormat(group: WhatsAppTemplateGroup, translation: TemplateTranslation): MetaTemplateRequest;
    /**
     * Build header component from translation.
     * Returns null if header type is NONE or null.
     */
    private buildHeaderComponent;
    /**
     * Build body component from translation.
     * Body is always required.
     */
    private buildBodyComponent;
    /**
     * Build footer component from translation.
     * Returns null if footer is null or empty.
     */
    private buildFooterComponent;
    /**
     * Build buttons component from translation.
     * Returns null if no buttons are present.
     */
    private buildButtonsComponent;
    /**
     * Map a local button to Meta API button format.
     */
    private mapButton;
    /**
     * Map local category to Meta API category.
     */
    private mapCategory;
    /**
     * Map local header type to Meta API header format.
     */
    private mapHeaderFormat;
    /**
     * Map local button type to Meta API button type.
     */
    private mapButtonType;
    /**
     * Extract variable placeholders from text.
     * Variables are in the format {{1}}, {{2}}, etc.
     *
     * @param text - The text to extract variables from
     * @returns Array of unique variable placeholders found
     */
    private extractVariables;
    /**
     * Generate sample values for variables.
     *
     * @param count - Number of sample values to generate
     * @returns Array of sample values like ['Sample1', 'Sample2', ...]
     */
    private generateSampleValues;
}
