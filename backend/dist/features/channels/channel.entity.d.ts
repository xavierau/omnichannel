/**
 * Channel entity represents messaging channel types (WhatsApp, SMS, Email).
 * Channels are system-level definitions, not tenant-specific.
 */
export declare class Channel {
    id: string;
    code: string;
    name: string;
    description: string | null;
    isActive: boolean;
    requiredCustomerFields: string[];
    createdAt: Date;
    updatedAt: Date;
}
