import { WhatsAppTemplateGroup } from './template-group.entity';
import { TemplateStatus, TemplateQuality, HeaderType, ButtonType } from './enums';
export interface TemplateButton {
    id: string;
    type: ButtonType;
    text: string;
    url?: string;
    phoneNumber?: string;
}
export declare class TemplateTranslation {
    id: string;
    templateGroupId: string;
    templateGroup: WhatsAppTemplateGroup;
    language: string;
    status: TemplateStatus;
    quality: TemplateQuality | null;
    headerType: HeaderType | null;
    headerContent: string | null;
    body: string;
    footer: string | null;
    buttons: TemplateButton[];
    rejectionReason: string | null;
    createdAt: Date;
    updatedAt: Date;
}
