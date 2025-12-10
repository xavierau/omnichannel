import { AppDataSource } from '@config/database.config';
import { ChannelAccount, ChannelAccountStatus } from '@features/channel-accounts/channel-account.entity';
import { Channel } from '@features/channels/channel.entity';
import { Provider } from '@features/providers/provider.entity';
import { CredentialService, EnvEncryptionKeyProvider } from '@features/messaging/services/credential.service';

async function createTestChannelAccount() {
  await AppDataSource.initialize();
  
  // Find WhatsApp channel
  const channelRepo = AppDataSource.getRepository(Channel);
  const channel = await channelRepo.findOne({ where: { code: 'whatsapp' } });
  if (!channel) throw new Error('WhatsApp channel not found');
  
  // Find Meta Cloud API provider
  const providerRepo = AppDataSource.getRepository(Provider);
  const provider = await providerRepo.findOne({ where: { code: 'meta_cloud_api' } });
  if (!provider) throw new Error('Meta Cloud API provider not found');
  
  // Encrypt credentials
  const credentialService = new CredentialService(new EnvEncryptionKeyProvider());
  const credentials = {
    phoneNumberId: '123456789012345',
    whatsappBusinessAccountId: '987654321098765',
    accessToken: 'test_access_token_fake_1234567890',
    appId: '1234567890123456',
    appSecret: 'abcdef1234567890abcdef1234567890',
  };
  
  const { encrypted, iv } = await credentialService.encryptCredentials(credentials);
  
  // Create channel account
  const accountRepo = AppDataSource.getRepository(ChannelAccount);
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
    status: ChannelAccountStatus.DISCONNECTED,
  });
  
  await accountRepo.save(account);
  console.log('✅ Created test channel account:', account.id);
  
  await AppDataSource.destroy();
}

createTestChannelAccount().catch(console.error);
