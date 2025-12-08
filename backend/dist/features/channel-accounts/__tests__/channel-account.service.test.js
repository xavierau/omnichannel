"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const channel_account_service_1 = require("../channel-account.service");
const channel_account_entity_1 = require("../channel-account.entity");
// Mock logger
jest.mock('../../../config/logger.config', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));
describe('ChannelAccountService', () => {
    let service;
    let mockChannelAccountRepo;
    let mockChannelRepo;
    let mockProviderRepo;
    let mockCredentialService;
    let mockMessagingService;
    let mockProviderRegistry;
    let mockProvider;
    const tenantId = 'tenant-123';
    const channelAccountId = 'account-123';
    const mockChannel = {
        id: 'channel-1',
        code: 'whatsapp',
        name: 'WhatsApp',
        isActive: true,
    };
    const mockProviderEntity = {
        id: 'provider-1',
        code: 'meta_cloud_api',
        name: 'Meta Cloud API',
        channelId: 'channel-1',
        configSchema: {
            required: ['phoneNumberId', 'whatsappBusinessAccountId', 'accessToken'],
        },
    };
    const validCredentials = {
        phoneNumberId: '123456789',
        whatsappBusinessAccountId: 'waba-123',
        accessToken: 'test-token',
        appId: 'app-123',
        appSecret: 'secret-123',
    };
    const mockAccountInfo = {
        businessName: 'Test Business',
        displayPhoneNumber: '+1 555-123-4567',
        qualityRating: 'GREEN',
        messagingLimitTier: 'TIER_100K',
    };
    beforeEach(() => {
        jest.clearAllMocks();
        mockChannelAccountRepo = {
            findByTenant: jest.fn(),
            findById: jest.fn(),
            findByIdAndTenant: jest.fn(),
            findPrimaryByTenantAndChannel: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            updateStatus: jest.fn(),
            setPrimary: jest.fn(),
            countByTenant: jest.fn(),
            findByPhoneNumberId: jest.fn(),
            updateWebhookConfig: jest.fn(),
        };
        mockChannelRepo = {
            findByCode: jest.fn(),
        };
        mockProviderRepo = {
            findByCode: jest.fn(),
            findByChannel: jest.fn(),
            findById: jest.fn(),
        };
        mockCredentialService = {
            encryptCredentials: jest.fn(),
            decryptCredentials: jest.fn(),
        };
        mockMessagingService = {
            verifyChannelAccountCredentials: jest.fn(),
            getProviderTemplates: jest.fn(),
        };
        mockProvider = {
            providerCode: 'meta_cloud_api',
            channelCode: 'whatsapp',
            initialize: jest.fn(),
            verifyCredentials: jest.fn(),
            sendTemplateMessage: jest.fn(),
            validateWebhookSignature: jest.fn(),
            parseWebhookPayload: jest.fn(),
        };
        mockProviderRegistry = {
            has: jest.fn(),
            get: jest.fn(),
            createInstance: jest.fn(),
            register: jest.fn(),
            listProviders: jest.fn(),
        };
        service = new channel_account_service_1.ChannelAccountService(mockChannelAccountRepo, mockChannelRepo, mockProviderRepo, mockCredentialService, mockMessagingService, mockProviderRegistry);
    });
    describe('create', () => {
        const createDto = {
            name: 'Marketing Line',
            phoneNumber: '+1 555-123-4567',
            channelCode: 'whatsapp',
            providerCode: 'meta_cloud_api',
            credentials: validCredentials,
            isActive: true,
            isPrimary: false,
        };
        const mockCreatedAccount = {
            id: channelAccountId,
            tenantId,
            channelId: 'channel-1',
            providerId: 'provider-1',
            name: 'Marketing Line',
            phoneNumber: '+1 555-123-4567',
            phoneNumberId: '123456789',
            status: channel_account_entity_1.ChannelAccountStatus.CONNECTED,
            isActive: true,
            isPrimary: false,
            channel: mockChannel,
            provider: mockProviderEntity,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastTestedAt: new Date(),
            errorMessage: null,
            webhookUrl: null,
        };
        beforeEach(() => {
            mockChannelRepo.findByCode.mockResolvedValue(mockChannel);
            mockProviderRepo.findByCode.mockResolvedValue(mockProviderEntity);
            mockCredentialService.encryptCredentials.mockResolvedValue({
                encrypted: 'encrypted-creds',
                iv: 'iv-123',
            });
            mockChannelAccountRepo.create.mockResolvedValue(mockCreatedAccount);
            mockChannelAccountRepo.findByIdAndTenant.mockResolvedValue(mockCreatedAccount);
        });
        it('should validate credentials synchronously before creating account', async () => {
            const verificationResult = {
                valid: true,
                accountInfo: mockAccountInfo,
            };
            mockProviderRegistry.has.mockReturnValue(true);
            mockProviderRegistry.createInstance.mockReturnValue(mockProvider);
            mockProvider.initialize.mockResolvedValue();
            mockProvider.verifyCredentials.mockResolvedValue(verificationResult);
            const result = await service.create(tenantId, createDto);
            expect(mockProviderRegistry.has).toHaveBeenCalledWith('meta_cloud_api');
            expect(mockProviderRegistry.createInstance).toHaveBeenCalledWith('meta_cloud_api');
            expect(mockProvider.initialize).toHaveBeenCalledWith(validCredentials);
            expect(mockProvider.verifyCredentials).toHaveBeenCalled();
            expect(result.accountInfo).toEqual(mockAccountInfo);
        });
        it('should throw error if credential verification fails', async () => {
            const verificationResult = {
                valid: false,
                error: 'Invalid access token',
            };
            mockProviderRegistry.has.mockReturnValue(true);
            mockProviderRegistry.createInstance.mockReturnValue(mockProvider);
            mockProvider.initialize.mockResolvedValue();
            mockProvider.verifyCredentials.mockResolvedValue(verificationResult);
            await expect(service.create(tenantId, createDto)).rejects.toThrow('Invalid credentials: Invalid access token');
            expect(mockChannelAccountRepo.create).not.toHaveBeenCalled();
        });
        it('should throw error if provider initialization fails', async () => {
            mockProviderRegistry.has.mockReturnValue(true);
            mockProviderRegistry.createInstance.mockReturnValue(mockProvider);
            mockProvider.initialize.mockRejectedValue(new Error('Connection failed'));
            await expect(service.create(tenantId, createDto)).rejects.toThrow('Invalid credentials: Connection failed');
            expect(mockChannelAccountRepo.create).not.toHaveBeenCalled();
        });
        it('should extract phoneNumberId from credentials', async () => {
            const verificationResult = {
                valid: true,
                accountInfo: mockAccountInfo,
            };
            mockProviderRegistry.has.mockReturnValue(true);
            mockProviderRegistry.createInstance.mockReturnValue(mockProvider);
            mockProvider.initialize.mockResolvedValue();
            mockProvider.verifyCredentials.mockResolvedValue(verificationResult);
            await service.create(tenantId, createDto);
            expect(mockChannelAccountRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                phoneNumberId: '123456789',
            }));
        });
        it('should set status to CONNECTED when credentials are valid', async () => {
            const verificationResult = {
                valid: true,
                accountInfo: mockAccountInfo,
            };
            mockProviderRegistry.has.mockReturnValue(true);
            mockProviderRegistry.createInstance.mockReturnValue(mockProvider);
            mockProvider.initialize.mockResolvedValue();
            mockProvider.verifyCredentials.mockResolvedValue(verificationResult);
            await service.create(tenantId, createDto);
            expect(mockChannelAccountRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                status: channel_account_entity_1.ChannelAccountStatus.CONNECTED,
            }));
        });
        it('should set lastTestedAt when credentials are verified', async () => {
            const verificationResult = {
                valid: true,
                accountInfo: mockAccountInfo,
            };
            mockProviderRegistry.has.mockReturnValue(true);
            mockProviderRegistry.createInstance.mockReturnValue(mockProvider);
            mockProvider.initialize.mockResolvedValue();
            mockProvider.verifyCredentials.mockResolvedValue(verificationResult);
            await service.create(tenantId, createDto);
            expect(mockChannelAccountRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                lastTestedAt: expect.any(Date),
            }));
        });
        it('should include accountInfo in response', async () => {
            const verificationResult = {
                valid: true,
                accountInfo: mockAccountInfo,
            };
            mockProviderRegistry.has.mockReturnValue(true);
            mockProviderRegistry.createInstance.mockReturnValue(mockProvider);
            mockProvider.initialize.mockResolvedValue();
            mockProvider.verifyCredentials.mockResolvedValue(verificationResult);
            const result = await service.create(tenantId, createDto);
            expect(result.accountInfo).toEqual({
                businessName: 'Test Business',
                displayPhoneNumber: '+1 555-123-4567',
                qualityRating: 'GREEN',
                messagingLimitTier: 'TIER_100K',
            });
        });
        it('should skip verification if provider not registered', async () => {
            mockProviderRegistry.has.mockReturnValue(false);
            const disconnectedAccount = {
                ...mockCreatedAccount,
                status: channel_account_entity_1.ChannelAccountStatus.DISCONNECTED,
            };
            mockChannelAccountRepo.create.mockResolvedValue(disconnectedAccount);
            mockChannelAccountRepo.findByIdAndTenant.mockResolvedValue(disconnectedAccount);
            const result = await service.create(tenantId, createDto);
            expect(mockProviderRegistry.createInstance).not.toHaveBeenCalled();
            expect(result.accountInfo).toBeUndefined();
        });
        it('should include phoneNumberId in response', async () => {
            const verificationResult = {
                valid: true,
                accountInfo: mockAccountInfo,
            };
            mockProviderRegistry.has.mockReturnValue(true);
            mockProviderRegistry.createInstance.mockReturnValue(mockProvider);
            mockProvider.initialize.mockResolvedValue();
            mockProvider.verifyCredentials.mockResolvedValue(verificationResult);
            const result = await service.create(tenantId, createDto);
            expect(result.phoneNumberId).toBe('123456789');
        });
        it('should throw error for missing channel', async () => {
            mockChannelRepo.findByCode.mockResolvedValue(null);
            await expect(service.create(tenantId, createDto)).rejects.toThrow("Channel 'whatsapp' not found");
        });
        it('should throw error for inactive channel', async () => {
            mockChannelRepo.findByCode.mockResolvedValue({
                ...mockChannel,
                isActive: false,
            });
            await expect(service.create(tenantId, createDto)).rejects.toThrow("Channel 'whatsapp' is not active");
        });
        it('should throw error for missing provider', async () => {
            mockProviderRepo.findByCode.mockResolvedValue(null);
            await expect(service.create(tenantId, createDto)).rejects.toThrow("Provider 'meta_cloud_api' not found");
        });
    });
    describe('generateWebhookConfig', () => {
        const mockAccount = {
            id: channelAccountId,
            tenantId,
            webhookSecretEncrypted: null,
            webhookSecretIv: null,
        };
        beforeEach(() => {
            mockChannelAccountRepo.findByIdAndTenant.mockResolvedValue(mockAccount);
            mockCredentialService.encryptCredentials.mockResolvedValue({
                encrypted: 'encrypted-token',
                iv: 'token-iv',
            });
            mockChannelAccountRepo.updateWebhookConfig.mockResolvedValue();
        });
        it('should throw error if account not found', async () => {
            mockChannelAccountRepo.findByIdAndTenant.mockResolvedValue(null);
            await expect(service.generateWebhookConfig(channelAccountId, tenantId)).rejects.toThrow('Channel account not found');
        });
        it('should generate new verify token if none exists', async () => {
            const result = await service.generateWebhookConfig(channelAccountId, tenantId);
            expect(mockCredentialService.encryptCredentials).toHaveBeenCalledWith({
                verifyToken: expect.any(String),
            });
            expect(mockChannelAccountRepo.updateWebhookConfig).toHaveBeenCalledWith(channelAccountId, tenantId, 'encrypted-token', 'token-iv');
            expect(result.verifyToken).toBeDefined();
            expect(result.verifyToken).toHaveLength(64); // 32 bytes in hex
        });
        it('should return existing verify token if available', async () => {
            const accountWithToken = {
                ...mockAccount,
                webhookSecretEncrypted: 'existing-encrypted',
                webhookSecretIv: 'existing-iv',
            };
            mockChannelAccountRepo.findByIdAndTenant.mockResolvedValue(accountWithToken);
            mockCredentialService.decryptCredentials.mockResolvedValue({
                verifyToken: 'existing-token-123',
            });
            const result = await service.generateWebhookConfig(channelAccountId, tenantId);
            expect(mockCredentialService.decryptCredentials).toHaveBeenCalledWith('existing-encrypted', 'existing-iv');
            expect(result.verifyToken).toBe('existing-token-123');
            expect(mockChannelAccountRepo.updateWebhookConfig).not.toHaveBeenCalled();
        });
        it('should generate new token if decryption fails', async () => {
            const accountWithToken = {
                ...mockAccount,
                webhookSecretEncrypted: 'corrupted-encrypted',
                webhookSecretIv: 'corrupted-iv',
            };
            mockChannelAccountRepo.findByIdAndTenant.mockResolvedValue(accountWithToken);
            mockCredentialService.decryptCredentials.mockRejectedValue(new Error('Decryption failed'));
            const result = await service.generateWebhookConfig(channelAccountId, tenantId);
            expect(mockCredentialService.encryptCredentials).toHaveBeenCalled();
            expect(mockChannelAccountRepo.updateWebhookConfig).toHaveBeenCalled();
            expect(result.verifyToken).toHaveLength(64);
        });
        it('should return correct webhook URL', async () => {
            process.env.WEBHOOK_BASE_URL = 'https://webhook.example.com';
            const result = await service.generateWebhookConfig(channelAccountId, tenantId);
            expect(result.webhookUrl).toBe('https://webhook.example.com/webhooks/meta');
            delete process.env.WEBHOOK_BASE_URL;
        });
        it('should fall back to API_BASE_URL if WEBHOOK_BASE_URL not set', async () => {
            delete process.env.WEBHOOK_BASE_URL;
            process.env.API_BASE_URL = 'https://api.example.com';
            const result = await service.generateWebhookConfig(channelAccountId, tenantId);
            expect(result.webhookUrl).toBe('https://api.example.com/webhooks/meta');
            delete process.env.API_BASE_URL;
        });
        it('should fall back to localhost if no base URL set', async () => {
            delete process.env.WEBHOOK_BASE_URL;
            delete process.env.API_BASE_URL;
            const result = await service.generateWebhookConfig(channelAccountId, tenantId);
            expect(result.webhookUrl).toBe('http://localhost:3000/webhooks/meta');
        });
    });
});
