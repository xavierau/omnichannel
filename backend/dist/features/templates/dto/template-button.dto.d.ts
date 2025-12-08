import { ButtonType } from '../enums';
/**
 * DTO for template button validation.
 * Buttons are used in WhatsApp template messages for quick actions.
 */
export declare class TemplateButtonDto {
    type: ButtonType;
    text: string;
    url?: string;
    phoneNumber?: string;
}
