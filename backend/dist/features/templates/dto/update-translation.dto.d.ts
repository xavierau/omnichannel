import { HeaderType, TemplateStatus, TemplateQuality } from '../enums';
import { TemplateButtonDto } from './template-button.dto';
/**
 * DTO for updating a template translation.
 * All fields are optional - only provided fields will be updated.
 * Status and quality fields are typically updated by admin/system for approval workflows.
 */
export declare class UpdateTranslationDto {
    headerType?: HeaderType;
    headerContent?: string;
    body?: string;
    footer?: string;
    buttons?: TemplateButtonDto[];
    status?: TemplateStatus;
    quality?: TemplateQuality;
    rejectionReason?: string;
}
