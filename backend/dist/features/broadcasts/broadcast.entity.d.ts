import { Tenant } from '../tenants/tenant.entity';
import { User } from '../users/user.entity';
import { WhatsAppTemplateGroup } from '../templates/template-group.entity';
import { CustomerGroup } from '../groups/group.entity';
import { ChannelAccount } from '../channel-accounts/channel-account.entity';
import { BroadcastStatus, RecipientType } from './enums';
import { TemplateCategory } from '../templates/enums';
export interface VariableConfig {
    index: number;
    sourceType: 'static' | 'customer_field';
    staticValue?: string;
    customerField?: string;
}
export interface HeaderConfig {
    type: 'text' | 'image' | 'video' | 'document';
    textVariable?: VariableConfig;
    mediaUrl?: string;
}
export interface ButtonVariableConfig {
    buttonIndex: number;
    variable: VariableConfig;
}
export interface TemplateVariablesConfig {
    header?: HeaderConfig;
    bodyVariables: VariableConfig[];
    buttonVariables: ButtonVariableConfig[];
}
export declare class Broadcast {
    id: string;
    tenantId: string;
    tenant: Tenant;
    name: string;
    description: string | null;
    templateId: string;
    template: WhatsAppTemplateGroup | null;
    templateName: string;
    templateCategory: TemplateCategory;
    templateLanguage: string;
    channelAccountId: string | null;
    channelAccount: ChannelAccount | null;
    recipientType: RecipientType;
    groupId: string | null;
    group: CustomerGroup | null;
    customerIds: string[] | null;
    totalRecipients: number;
    templateVariables: TemplateVariablesConfig;
    scheduledAt: Date | null;
    isImmediate: boolean;
    timezone: string;
    status: BroadcastStatus;
    sentCount: number;
    deliveredCount: number;
    readCount: number;
    failedCount: number;
    createdBy: string;
    creator: User | null;
    createdAt: Date;
    updatedAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
    previousStatus: BroadcastStatus | null;
    customFields: Record<string, unknown>;
}
