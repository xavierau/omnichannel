import { container } from 'tsyringe';
import { ProviderRegistry } from './provider-registry';
import { MetaCloudApiProvider } from './providers/meta-cloud-api.provider';
import { logger } from '../../config/logger.config';

/**
 * Register all available messaging providers.
 *
 * Call this during application bootstrap to make providers available
 * for the ProviderFactory.
 */
export function registerMessagingProviders(): void {
  const registry = container.resolve(ProviderRegistry);

  // Register Meta Cloud API provider (WhatsApp)
  registry.register('meta_cloud_api', MetaCloudApiProvider);

  // Future providers (Phase 7+):
  // registry.register('twilio_whatsapp', TwilioWhatsAppProvider);
  // registry.register('dialogue360', Dialogue360Provider);
  // registry.register('infobip', InfobipProvider);
  // registry.register('twilio_sms', TwilioSmsProvider);

  logger.info('Messaging providers registered', {
    providers: registry.listProviders(),
  });
}
