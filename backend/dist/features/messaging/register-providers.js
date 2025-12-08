"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMessagingProviders = registerMessagingProviders;
const tsyringe_1 = require("tsyringe");
const provider_registry_1 = require("./provider-registry");
const meta_cloud_api_provider_1 = require("./providers/meta-cloud-api.provider");
const logger_config_1 = require("../../config/logger.config");
/**
 * Register all available messaging providers.
 *
 * Call this during application bootstrap to make providers available
 * for the ProviderFactory.
 */
function registerMessagingProviders() {
    const registry = tsyringe_1.container.resolve(provider_registry_1.ProviderRegistry);
    // Register Meta Cloud API provider (WhatsApp)
    registry.register('meta_cloud_api', meta_cloud_api_provider_1.MetaCloudApiProvider);
    // Future providers (Phase 7+):
    // registry.register('twilio_whatsapp', TwilioWhatsAppProvider);
    // registry.register('dialogue360', Dialogue360Provider);
    // registry.register('infobip', InfobipProvider);
    // registry.register('twilio_sms', TwilioSmsProvider);
    logger_config_1.logger.info('Messaging providers registered', {
        providers: registry.listProviders(),
    });
}
