"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_config_1 = require("../config/database.config");
const channel_account_entity_1 = require("../features/channel-accounts/channel-account.entity");
const channel_entity_1 = require("../features/channels/channel.entity");
const provider_entity_1 = require("../features/providers/provider.entity");
const credential_service_1 = require("../features/messaging/services/credential.service");
async function createTestChannelAccount() {
    await database_config_1.AppDataSource.initialize();
    // Find WhatsApp channel
    const channelRepo = database_config_1.AppDataSource.getRepository(channel_entity_1.Channel);
    const channel = await channelRepo.findOne({ where: { code: 'whatsapp' } });
    if (!channel)
        throw new Error('WhatsApp channel not found');
    // Find Meta Cloud API provider
    const providerRepo = database_config_1.AppDataSource.getRepository(provider_entity_1.Provider);
    const provider = await providerRepo.findOne({ where: { code: 'meta_cloud_api' } });
    if (!provider)
        throw new Error('Meta Cloud API provider not found');
    // Encrypt credentials
    const credentialService = new credential_service_1.CredentialService(new credential_service_1.EnvEncryptionKeyProvider());
    const credentials = {
        phoneNumberId: '123456789012345',
        whatsappBusinessAccountId: '987654321098765',
        accessToken: 'test_access_token_fake_1234567890',
        appId: '1234567890123456',
        appSecret: 'abcdef1234567890abcdef1234567890',
    };
    const { encrypted, iv } = await credentialService.encryptCredentials(credentials);
    // Create channel account
    const accountRepo = database_config_1.AppDataSource.getRepository(channel_account_entity_1.ChannelAccount);
    const account = accountRepo.create({
        tenantId: '89e5c8e2-d51c-450c-ba79-1298f1576c89',
        channelId: channel.id,
        providerId: provider.id,
        name: 'Test WhatsApp Config',
        phoneNumberId: '123456789012345',
        encryptedCredentials: encrypted,
        credentialsIv: iv,
        isActive: true,
        isPrimary: false,
        status: channel_account_entity_1.ChannelAccountStatus.DISCONNECTED,
    });
    await accountRepo.save(account);
    console.log('✅ Created test channel account:', account.id);
    await database_config_1.AppDataSource.destroy();
}
createTestChannelAccount().catch(console.error);
