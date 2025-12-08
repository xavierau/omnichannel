import { RecipientType } from '../enums';
import { TemplateVariablesConfigDto } from './variable-config.dto';
/**
 * DTO for creating a new broadcast.
 * Includes comprehensive validation for all fields including conditional requirements.
 */
export declare class CreateBroadcastDto {
    name: string;
    description?: string;
    templateId: string;
    templateLanguage: string;
    recipientType: RecipientType;
    groupId?: string;
    customerIds?: string[];
    templateVariables: TemplateVariablesConfigDto;
    isImmediate: boolean;
    scheduledAt?: Date;
    timezone?: string;
    customFields?: Record<string, unknown>;
}
