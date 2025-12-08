import { RecipientType } from '../enums';
import { TemplateVariablesConfigDto } from './variable-config.dto';
/**
 * DTO for updating an existing broadcast.
 * All fields are optional. Only allowed when broadcast status is DRAFT or SCHEDULED.
 * Conditional validations apply based on recipientType and isImmediate.
 */
export declare class UpdateBroadcastDto {
    name?: string;
    description?: string;
    templateId?: string;
    templateLanguage?: string;
    recipientType?: RecipientType;
    groupId?: string;
    customerIds?: string[];
    templateVariables?: TemplateVariablesConfigDto;
    isImmediate?: boolean;
    scheduledAt?: Date;
    timezone?: string;
    customFields?: Record<string, unknown>;
}
