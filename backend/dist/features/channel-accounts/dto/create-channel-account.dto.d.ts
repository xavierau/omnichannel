/**
 * DTO for creating a channel account with class-validator decorators.
 *
 * This class validates the request body for channel account creation.
 * Credentials are provider-specific based on the provider's config_schema.
 */
export declare class CreateChannelAccountDto {
    name: string;
    phoneNumber?: string;
    channelCode: string;
    providerCode?: string;
    credentials: Record<string, unknown>;
    isActive?: boolean;
    isPrimary?: boolean;
    teamIds?: string[];
}
