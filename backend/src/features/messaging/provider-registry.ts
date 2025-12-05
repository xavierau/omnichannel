import { singleton } from 'tsyringe';
import { IMessagingProvider } from './interfaces';

/**
 * Type for provider implementation constructor.
 */
export type ProviderConstructor = new () => IMessagingProvider;

/**
 * Registry for provider implementations.
 * Allows dynamic provider registration and lookup.
 */
@singleton()
export class ProviderRegistry {
  private providers: Map<string, ProviderConstructor> = new Map();

  /**
   * Register a provider implementation.
   *
   * @param providerCode - Unique provider code (e.g., 'meta_cloud_api')
   * @param providerClass - Provider implementation class constructor
   */
  register(providerCode: string, providerClass: ProviderConstructor): void {
    if (this.providers.has(providerCode)) {
      throw new Error(`Provider '${providerCode}' is already registered`);
    }
    this.providers.set(providerCode, providerClass);
  }

  /**
   * Get a provider implementation by code.
   *
   * @param providerCode - Provider code to look up
   * @returns Provider constructor or undefined
   */
  get(providerCode: string): ProviderConstructor | undefined {
    return this.providers.get(providerCode);
  }

  /**
   * Check if a provider is registered.
   *
   * @param providerCode - Provider code to check
   * @returns true if provider is registered
   */
  has(providerCode: string): boolean {
    return this.providers.has(providerCode);
  }

  /**
   * List all registered provider codes.
   *
   * @returns Array of registered provider codes
   */
  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Create a new instance of a provider (uninitialized).
   *
   * @param providerCode - Provider code
   * @returns New provider instance
   */
  createInstance(providerCode: string): IMessagingProvider {
    const ProviderClass = this.get(providerCode);
    if (!ProviderClass) {
      throw new Error(`Provider '${providerCode}' is not registered`);
    }
    return new ProviderClass();
  }
}
