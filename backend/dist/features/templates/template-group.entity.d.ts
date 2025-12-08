import { Tenant } from '../tenants/tenant.entity';
import { ChannelAccount } from '../channel-accounts/channel-account.entity';
import { TemplateTranslation } from './template-translation.entity';
import { TemplateCategory } from './enums';
export declare class WhatsAppTemplateGroup {
    id: string;
    tenantId: string;
    tenant: Tenant;
    /**
     * Channel account this template belongs to.
     * Templates are approved per WABA (WhatsApp Business Account),
     * so each channel account has its own set of approved templates.
     */
    channelAccountId: string | null;
    channelAccount: ChannelAccount | null;
    name: string;
    category: TemplateCategory;
    customFields: Record<string, unknown>;
    translations: TemplateTranslation[];
    createdAt: Date;
    updatedAt: Date;
}
