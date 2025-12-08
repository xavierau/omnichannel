import { IMessagingProvider } from './interfaces';
/**
 * Type for provider implementation constructor.
 */
export type ProviderConstructor = new () => IMessagingProvider;
/**
 * Registry for provider implementations.
 * Allows dynamic provider registration and lookup.
 */
export declare class ProviderRegistry {
    private providers;
    /**
     * Register a provider implementation.
     *
     * @param providerCode - Unique provider code (e.g., 'meta_cloud_api')
     * @param providerClass - Provider implementation class constructor
     */
    register(providerCode: string, providerClass: ProviderConstructor): void;
    /**
     * Get a provider implementation by code.
     *
     * @param providerCode - Provider code to look up
     * @returns Provider constructor or undefined
     */
    get(providerCode: string): ProviderConstructor | undefined;
    /**
     * Check if a provider is registered.
     *
     * @param providerCode - Provider code to check
     * @returns true if provider is registered
     */
    has(providerCode: string): boolean;
    /**
     * List all registered provider codes.
     *
     * @returns Array of registered provider codes
     */
    listProviders(): string[];
    /**
     * Create a new instance of a provider (uninitialized).
     *
     * @param providerCode - Provider code
     * @returns New provider instance
     */
    createInstance(providerCode: string): IMessagingProvider;
}
