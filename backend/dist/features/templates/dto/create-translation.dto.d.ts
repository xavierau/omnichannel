import { HeaderType } from '../enums';
import { TemplateButtonDto } from './template-button.dto';
/**
 * DTO for creating a template translation.
 * Each translation represents the template content in a specific language.
 */
export declare class CreateTranslationDto {
    language: string;
    headerType?: HeaderType;
    headerContent?: string;
    body: string;
    footer?: string;
    buttons?: TemplateButtonDto[];
}
