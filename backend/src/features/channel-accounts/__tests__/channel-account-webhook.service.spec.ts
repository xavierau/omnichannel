import 'reflect-metadata';
import * as crypto from 'crypto';
import { ChannelAccountService } from '../channel-account.service';
import { ChannelAccountRepository } from '../channel-account.repository';
import { ChannelRepository } from '../../channels/channel.repository';
import { ProviderRepository } from '../../providers/provider.repository';
import { CredentialService } from '../../messaging/services/credential.service';
import { MessagingService } from '../../messaging/services/messaging.service';
import { ProviderRegistry } from '../../messaging/provider-registry';
import { TeamService } from '@features/teams/services/team.service';
import { ChannelAccount, ChannelAccountStatus } from '../channel-account.entity';
import {
  NotFoundException,
  BadRequestException,
} from '../../../shared/exceptions/http-exceptions';

// Mock the logger to avoid console output during tests
jest.mock('../../../config/logger.config', () => ({
  auditLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock axios for webhook test
jest.mock('axios');

// Mock url-validator
jest.mock('../../../shared/utils/url-validator.utils', () => ({
  validateWebhookUrl: jest.fn(),
}));

describe('ChannelAccountService - Webhook Settings', () => {
  let service: ChannelAccountService;
  let channelAccountRepo: jest.Mocked<ChannelAccountRepository>;
  let channelRepo: jest.Mocked<ChannelRepository>;
  let providerRepo: jest.Mocked<ProviderRepository>;
  let credentialService: jest.Mocked<CredentialService>;
  let messagingService: jest.Mocked<MessagingService>;
  let providerRegistry: jest.Mocked<ProviderRegistry>;
  let teamService: jest.Mocked<TeamService>;

  const tenantId = 'tenant-123';
  const channelAccountId = 'channel-account-456';

  const createMockChannelAccount = (overrides: Partial<ChannelAccount> = {}): ChannelAccount =>
    ({
      id: channelAccountId,
      tenantId,
      channelId: 'channel-001',
      providerId: 'provider-001',
      name: 'Test Account',
      phoneNumber: '+1234567890',
      phoneNumberId: 'phone-123',
      encryptedCredentials: 'encrypted',
      credentialsIv: 'iv',
      isActive: true,
      isPrimary: false,
      status: ChannelAccountStatus.CONNECTED,
      lastTestedAt: new Date(),
      errorMessage: null,
      webhookUrl: null,
      webhookSecretEncrypted: null,
      webhookSecretIv: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      channel: { id: 'channel-001', code: 'whatsapp', name: 'WhatsApp' },
      provider: { id: 'provider-001', code: 'meta_cloud_api', name: 'Meta Cloud API' },
      ...overrides,
    }) as ChannelAccount;

  beforeEach(() => {
    channelAccountRepo = {
      findByIdAndTenant: jest.fn(),
      update: jest.fn(),
      updateWebhookConfig: jest.fn(),
    } as unknown as jest.Mocked<ChannelAccountRepository>;

    channelRepo = {} as jest.Mocked<ChannelRepository>;
    providerRepo = {} as jest.Mocked<ProviderRepository>;

    credentialService = {
      encryptString: jest.fn(),
      decryptString: jest.fn(),
      encryptCredentials: jest.fn(),
      decryptCredentials: jest.fn(),
    } as unknown as jest.Mocked<CredentialService>;

    messagingService = {} as jest.Mocked<MessagingService>;
    providerRegistry = {} as jest.Mocked<ProviderRegistry>;
    teamService = {} as jest.Mocked<TeamService>;

    service = new ChannelAccountService(
      channelAccountRepo,
      channelRepo,
      providerRepo,
      credentialService,
      messagingService,
      providerRegistry,
      teamService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWebhookSettings', () => {
    it('should return webhook settings when account exists', async () => {
      const mockAccount = createMockChannelAccount({
        webhookUrl: 'https://example.com/webhook',
        webhookSecretEncrypted: 'encrypted-secret',
        webhookSecretIv: 'secret-iv',
      });
      channelAccountRepo.findByIdAndTenant.mockResolvedValue(mockAccount);

      const result = await service.getWebhookSettings(channelAccountId, tenantId);

      expect(channelAccountRepo.findByIdAndTenant).toHaveBeenCalledWith(
        channelAccountId,
        tenantId
      );
      expect(result).toEqual({
        webhookUrl: 'https://example.com/webhook',
        hasWebhookSecret: true,
        webhookEventsEnabled: true,
      });
    });

    it('should return webhookEventsEnabled as false when webhookUrl is null', async () => {
      const mockAccount = createMockChannelAccount({
        webhookUrl: null,
        webhookSecretEncrypted: null,
        webhookSecretIv: null,
      });
      channelAccountRepo.findByIdAndTenant.mockResolvedValue(mockAccount);

      const result = await service.getWebhookSettings(channelAccountId, tenantId);

      expect(result).toEqual({
        webhookUrl: null,
        hasWebhookSecret: false,
        webhookEventsEnabled: false,
      });
    });

    it('should throw NotFoundException when account does not exist', async () => {
      channelAccountRepo.findByIdAndTenant.mockResolvedValue(null);

      await expect(service.getWebhookSettings(channelAccountId, tenantId)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updateWebhookSettings', () => {
    it('should update webhookUrl when valid HTTPS URL provided', async () => {
      // Use an account that already has a secret to avoid auto-generation
      const mockAccount = createMockChannelAccount({
        webhookSecretEncrypted: 'existing-encrypted',
        webhookSecretIv: 'existing-iv',
      });
      const updatedAccount = createMockChannelAccount({
        webhookUrl: 'https://example.com/webhook',
        webhookSecretEncrypted: 'existing-encrypted',
        webhookSecretIv: 'existing-iv',
      });

      channelAccountRepo.findByIdAndTenant.mockResolvedValueOnce(mockAccount);
      channelAccountRepo.update.mockResolvedValue(updatedAccount);
      channelAccountRepo.findByIdAndTenant.mockResolvedValueOnce(updatedAccount);

      const result = await service.updateWebhookSettings(channelAccountId, tenantId, {
        webhookUrl: 'https://example.com/webhook',
      });

      expect(channelAccountRepo.update).toHaveBeenCalledWith(
        channelAccountId,
        tenantId,
        expect.objectContaining({
          webhookUrl: 'https://example.com/webhook',
        })
      );
      expect(result.webhookUrl).toBe('https://example.com/webhook');
    });

    it('should reject non-HTTPS URLs', async () => {
      const mockAccount = createMockChannelAccount();
      channelAccountRepo.findByIdAndTenant.mockResolvedValue(mockAccount);

      await expect(
        service.updateWebhookSettings(channelAccountId, tenantId, {
          webhookUrl: 'http://example.com/webhook',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should auto-generate webhook secret when setting webhookUrl for the first time', async () => {
      const mockAccount = createMockChannelAccount({
        webhookUrl: null,
        webhookSecretEncrypted: null,
        webhookSecretIv: null,
      });
      const updatedAccount = createMockChannelAccount({
        webhookUrl: 'https://example.com/webhook',
        webhookSecretEncrypted: 'encrypted',
        webhookSecretIv: 'iv',
      });

      channelAccountRepo.findByIdAndTenant.mockResolvedValueOnce(mockAccount);
      credentialService.encryptString.mockResolvedValue({
        encrypted: 'encrypted',
        iv: 'iv',
      });
      channelAccountRepo.update.mockResolvedValue(updatedAccount);
      channelAccountRepo.findByIdAndTenant.mockResolvedValueOnce(updatedAccount);

      await service.updateWebhookSettings(channelAccountId, tenantId, {
        webhookUrl: 'https://example.com/webhook',
      });

      expect(credentialService.encryptString).toHaveBeenCalled();
    });

    it('should clear webhookUrl when null is provided', async () => {
      const mockAccount = createMockChannelAccount({
        webhookUrl: 'https://example.com/webhook',
      });
      const updatedAccount = createMockChannelAccount({
        webhookUrl: null,
      });

      channelAccountRepo.findByIdAndTenant.mockResolvedValueOnce(mockAccount);
      channelAccountRepo.update.mockResolvedValue(updatedAccount);
      channelAccountRepo.findByIdAndTenant.mockResolvedValueOnce(updatedAccount);

      const result = await service.updateWebhookSettings(channelAccountId, tenantId, {
        webhookUrl: null,
      });

      expect(result.webhookUrl).toBeNull();
    });

    it('should throw NotFoundException when account does not exist', async () => {
      channelAccountRepo.findByIdAndTenant.mockResolvedValue(null);

      await expect(
        service.updateWebhookSettings(channelAccountId, tenantId, {
          webhookUrl: 'https://example.com/webhook',
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should not regenerate secret when webhookUrl already exists and is being updated', async () => {
      const mockAccount = createMockChannelAccount({
        webhookUrl: 'https://old.example.com/webhook',
        webhookSecretEncrypted: 'existing-encrypted',
        webhookSecretIv: 'existing-iv',
      });
      const updatedAccount = createMockChannelAccount({
        webhookUrl: 'https://new.example.com/webhook',
        webhookSecretEncrypted: 'existing-encrypted',
        webhookSecretIv: 'existing-iv',
      });

      channelAccountRepo.findByIdAndTenant.mockResolvedValueOnce(mockAccount);
      channelAccountRepo.update.mockResolvedValue(updatedAccount);
      channelAccountRepo.findByIdAndTenant.mockResolvedValueOnce(updatedAccount);

      await service.updateWebhookSettings(channelAccountId, tenantId, {
        webhookUrl: 'https://new.example.com/webhook',
      });

      // Should not call encryptString since secret already exists
      expect(credentialService.encryptString).not.toHaveBeenCalled();
    });
  });

  describe('regenerateWebhookSecret', () => {
    it('should generate and return new secret', async () => {
      const mockAccount = createMockChannelAccount({
        webhookUrl: 'https://example.com/webhook',
        webhookSecretEncrypted: 'old-encrypted',
        webhookSecretIv: 'old-iv',
      });

      channelAccountRepo.findByIdAndTenant.mockResolvedValue(mockAccount);
      credentialService.encryptString.mockResolvedValue({
        encrypted: 'new-encrypted',
        iv: 'new-iv',
      });

      const result = await service.regenerateWebhookSecret(channelAccountId, tenantId);

      expect(result.secret).toBeDefined();
      expect(result.secret).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(channelAccountRepo.update).toHaveBeenCalledWith(
        channelAccountId,
        tenantId,
        expect.objectContaining({
          webhookSecretEncrypted: 'new-encrypted',
          webhookSecretIv: 'new-iv',
        })
      );
    });

    it('should throw NotFoundException when account does not exist', async () => {
      channelAccountRepo.findByIdAndTenant.mockResolvedValue(null);

      await expect(
        service.regenerateWebhookSecret(channelAccountId, tenantId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when webhook URL is not configured', async () => {
      const mockAccount = createMockChannelAccount({
        webhookUrl: null,
      });

      channelAccountRepo.findByIdAndTenant.mockResolvedValue(mockAccount);

      await expect(
        service.regenerateWebhookSecret(channelAccountId, tenantId)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('testWebhook', () => {
    const { validateWebhookUrl } = require('../../../shared/utils/url-validator.utils');
    const axios = require('axios');

    it('should dispatch test webhook and return success', async () => {
      const mockAccount = createMockChannelAccount({
        webhookUrl: 'https://example.com/webhook',
        webhookSecretEncrypted: 'encrypted',
        webhookSecretIv: 'iv',
      });

      channelAccountRepo.findByIdAndTenant.mockResolvedValue(mockAccount);
      credentialService.decryptString.mockResolvedValue('webhook-secret');
      validateWebhookUrl.mockResolvedValue({ isValid: true });
      axios.post.mockResolvedValue({ status: 200 });

      const result = await service.testWebhook(channelAccountId, tenantId);

      expect(result).toEqual({ success: true });
      expect(axios.post).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({
          event: 'test',
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Webhook-Signature': expect.stringMatching(/^sha256=/),
            'X-Webhook-Timestamp': expect.any(String),
          }),
        })
      );
    });

    it('should return error when webhook URL is not configured', async () => {
      const mockAccount = createMockChannelAccount({
        webhookUrl: null,
      });

      channelAccountRepo.findByIdAndTenant.mockResolvedValue(mockAccount);

      const result = await service.testWebhook(channelAccountId, tenantId);

      expect(result).toEqual({
        success: false,
        error: 'Webhook URL is not configured',
      });
    });

    it('should return error when webhook secret is not configured', async () => {
      const mockAccount = createMockChannelAccount({
        webhookUrl: 'https://example.com/webhook',
        webhookSecretEncrypted: null,
        webhookSecretIv: null,
      });

      channelAccountRepo.findByIdAndTenant.mockResolvedValue(mockAccount);

      const result = await service.testWebhook(channelAccountId, tenantId);

      expect(result).toEqual({
        success: false,
        error: 'Webhook secret is not configured',
      });
    });

    it('should return error when URL validation fails', async () => {
      const mockAccount = createMockChannelAccount({
        webhookUrl: 'https://internal.local/webhook',
        webhookSecretEncrypted: 'encrypted',
        webhookSecretIv: 'iv',
      });

      channelAccountRepo.findByIdAndTenant.mockResolvedValue(mockAccount);
      credentialService.decryptString.mockResolvedValue('webhook-secret');
      validateWebhookUrl.mockResolvedValue({
        isValid: false,
        error: 'Localhost and local hostnames are not allowed',
      });

      const result = await service.testWebhook(channelAccountId, tenantId);

      expect(result).toEqual({
        success: false,
        error: 'URL validation failed: Localhost and local hostnames are not allowed',
      });
    });

    it('should return error when HTTP request fails', async () => {
      const mockAccount = createMockChannelAccount({
        webhookUrl: 'https://example.com/webhook',
        webhookSecretEncrypted: 'encrypted',
        webhookSecretIv: 'iv',
      });

      channelAccountRepo.findByIdAndTenant.mockResolvedValue(mockAccount);
      credentialService.decryptString.mockResolvedValue('webhook-secret');
      validateWebhookUrl.mockResolvedValue({ isValid: true });
      axios.post.mockRejectedValue(new Error('Connection refused'));

      const result = await service.testWebhook(channelAccountId, tenantId);

      expect(result).toEqual({
        success: false,
        error: 'Connection refused',
      });
    });

    it('should throw NotFoundException when account does not exist', async () => {
      channelAccountRepo.findByIdAndTenant.mockResolvedValue(null);

      await expect(service.testWebhook(channelAccountId, tenantId)).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
