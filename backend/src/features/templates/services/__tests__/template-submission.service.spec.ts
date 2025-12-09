import 'reflect-metadata';
import { TemplateSubmissionService, SubmissionResult } from '../template-submission.service';
import { TemplateRepository } from '../../template.repository';
import { TemplateTransformerService, MetaTemplateRequest } from '../template-transformer.service';
import { TemplateSseService } from '../../template-sse.service';
import { ProviderFactory } from '../../../messaging/provider-factory';
import { CredentialService } from '../../../messaging/services/credential.service';
import { ChannelAccountRepository } from '../../../channel-accounts/channel-account.repository';
import {
  MetaCloudApiProvider,
  CreateMetaTemplateResponse,
} from '../../../messaging/providers/meta-cloud-api.provider';
import { TemplateStatus, TemplateCategory, HeaderType } from '../../enums';
import { WhatsAppTemplateGroup } from '../../template-group.entity';
import { TemplateTranslation } from '../../template-translation.entity';
import { ChannelAccount } from '../../../channel-accounts/channel-account.entity';

/**
 * Unit tests for TemplateSubmissionService.
 *
 * Tests are organized by the orchestration steps:
 * 1. Load template and translation
 * 2. Verify channel account
 * 3. Initialize provider with credentials
 * 4. Transform to Meta format
 * 5. Submit to Meta API
 * 6. Handle success/error scenarios
 */
describe('TemplateSubmissionService', () => {
  let service: TemplateSubmissionService;
  let mockTemplateRepo: jest.Mocked<TemplateRepository>;
  let mockTransformer: jest.Mocked<TemplateTransformerService>;
  let mockSseService: jest.Mocked<TemplateSseService>;
  let mockProviderFactory: jest.Mocked<ProviderFactory>;
  let mockCredentialService: jest.Mocked<CredentialService>;
  let mockChannelAccountRepo: jest.Mocked<ChannelAccountRepository>;
  let mockProvider: jest.Mocked<MetaCloudApiProvider>;

  const tenantId = 'tenant-123';
  const templateGroupId = 'template-group-456';
  const translationId = 'translation-789';
  const channelAccountId = 'channel-account-abc';
  const metaTemplateId = 'meta-template-xyz';

  /**
   * Creates a test template group with translations.
   */
  const createTestTemplateGroup = (
    overrides: Partial<WhatsAppTemplateGroup> = {},
    translationOverrides: Partial<TemplateTranslation> = {}
  ): WhatsAppTemplateGroup => {
    const translation: TemplateTranslation = {
      id: translationId,
      templateGroupId,
      language: 'en',
      status: TemplateStatus.PENDING,
      quality: null,
      headerType: HeaderType.TEXT,
      headerContent: 'Welcome!',
      body: 'Hello {{1}}, your order is ready.',
      footer: null,
      buttons: [],
      rejectionReason: null,
      metaTemplateId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      templateGroup: null as any,
      ...translationOverrides,
    };

    return {
      id: templateGroupId,
      tenantId,
      channelAccountId,
      name: 'order_confirmation',
      category: TemplateCategory.UTILITY,
      customFields: {},
      translations: [translation],
      createdAt: new Date(),
      updatedAt: new Date(),
      tenant: null as any,
      channelAccount: null as any,
      ...overrides,
    };
  };

  /**
   * Creates a test channel account.
   */
  const createTestChannelAccount = (
    overrides: Partial<ChannelAccount> = {}
  ): ChannelAccount => {
    return {
      id: channelAccountId,
      tenantId,
      channelId: 'channel-id',
      providerId: 'provider-id',
      name: 'Test WhatsApp Account',
      phoneNumberId: 'phone-number-123',
      encryptedCredentials: 'encrypted-creds',
      credentialsIv: 'creds-iv',
      isActive: true,
      isPrimary: true,
      status: 'connected',
      errorMessage: null,
      lastTestedAt: new Date(),
      webhookSecretEncrypted: null,
      webhookSecretIv: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      channel: null as any,
      provider: null as any,
      tenant: null as any,
      ...overrides,
    } as ChannelAccount;
  };

  /**
   * Creates a test Meta template request.
   */
  const createTestMetaRequest = (): MetaTemplateRequest => ({
    name: 'order_confirmation',
    language: 'en',
    category: 'UTILITY',
    components: [
      { type: 'BODY', text: 'Hello {{1}}, your order is ready.' },
    ],
  });

  beforeEach(() => {
    // Create mocks
    mockTemplateRepo = {
      findById: jest.fn(),
      updateTranslation: jest.fn(),
    } as unknown as jest.Mocked<TemplateRepository>;

    mockTransformer = {
      transformToMetaFormat: jest.fn(),
    } as unknown as jest.Mocked<TemplateTransformerService>;

    mockSseService = {
      emitToTenant: jest.fn(),
      emitTemplateStatusChange: jest.fn(),
    } as unknown as jest.Mocked<TemplateSseService>;

    mockProvider = {
      initialize: jest.fn(),
      createTemplate: jest.fn(),
    } as unknown as jest.Mocked<MetaCloudApiProvider>;

    mockProviderFactory = {
      createProviderForWebhook: jest.fn().mockReturnValue(mockProvider),
    } as unknown as jest.Mocked<ProviderFactory>;

    mockCredentialService = {
      decryptCredentials: jest.fn(),
    } as unknown as jest.Mocked<CredentialService>;

    mockChannelAccountRepo = {
      findByIdAndTenant: jest.fn(),
    } as unknown as jest.Mocked<ChannelAccountRepository>;

    // Create service with mocked dependencies
    service = new TemplateSubmissionService(
      mockTemplateRepo,
      mockTransformer,
      mockSseService,
      mockProviderFactory,
      mockCredentialService,
      mockChannelAccountRepo
    );
  });

  describe('submitTemplate', () => {
    describe('validation errors', () => {
      it('should return error when template group is not found', async () => {
        mockTemplateRepo.findById.mockResolvedValue(null);

        const result = await service.submitTemplate(tenantId, templateGroupId, translationId);

        expect(result).toEqual<SubmissionResult>({
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: `Template group ${templateGroupId} not found`,
            retryable: false,
          },
        });
        expect(mockTemplateRepo.findById).toHaveBeenCalledWith(tenantId, templateGroupId);
      });

      it('should return error when translation is not found', async () => {
        const templateGroup = createTestTemplateGroup();
        templateGroup.translations = []; // No translations
        mockTemplateRepo.findById.mockResolvedValue(templateGroup);

        const result = await service.submitTemplate(tenantId, templateGroupId, translationId);

        expect(result).toEqual<SubmissionResult>({
          success: false,
          error: {
            code: 'TRANSLATION_NOT_FOUND',
            message: `Translation ${translationId} not found in template group`,
            retryable: false,
          },
        });
      });

      it('should return error when template has no channel account', async () => {
        const templateGroup = createTestTemplateGroup({ channelAccountId: null });
        mockTemplateRepo.findById.mockResolvedValue(templateGroup);

        const result = await service.submitTemplate(tenantId, templateGroupId, translationId);

        expect(result).toEqual<SubmissionResult>({
          success: false,
          error: {
            code: 'NO_CHANNEL_ACCOUNT',
            message: 'Template group has no associated channel account',
            retryable: false,
          },
        });
      });

      it('should return error when channel account is not found', async () => {
        const templateGroup = createTestTemplateGroup();
        mockTemplateRepo.findById.mockResolvedValue(templateGroup);
        mockChannelAccountRepo.findByIdAndTenant.mockResolvedValue(null);

        const result = await service.submitTemplate(tenantId, templateGroupId, translationId);

        expect(result).toEqual<SubmissionResult>({
          success: false,
          error: {
            code: 'CHANNEL_ACCOUNT_NOT_FOUND',
            message: `Channel account ${channelAccountId} not found`,
            retryable: false,
          },
        });
        expect(mockChannelAccountRepo.findByIdAndTenant).toHaveBeenCalledWith(
          channelAccountId,
          tenantId
        );
      });
    });

    describe('successful submission', () => {
      beforeEach(() => {
        // Setup happy path mocks
        const templateGroup = createTestTemplateGroup();
        const channelAccount = createTestChannelAccount();
        const metaRequest = createTestMetaRequest();
        const decryptedCredentials = {
          accessToken: 'test-token',
          phoneNumberId: 'phone-123',
          whatsappBusinessAccountId: 'waba-456',
        };

        mockTemplateRepo.findById.mockResolvedValue(templateGroup);
        mockChannelAccountRepo.findByIdAndTenant.mockResolvedValue(channelAccount);
        mockCredentialService.decryptCredentials.mockResolvedValue(decryptedCredentials);
        mockTransformer.transformToMetaFormat.mockReturnValue(metaRequest);
        mockProvider.createTemplate.mockResolvedValue({
          success: true,
          id: metaTemplateId,
          status: 'PENDING',
        });
        mockTemplateRepo.updateTranslation.mockResolvedValue({} as any);
      });

      it('should successfully submit template and return meta template id', async () => {
        const result = await service.submitTemplate(tenantId, templateGroupId, translationId);

        expect(result).toEqual<SubmissionResult>({
          success: true,
          metaTemplateId,
        });
      });

      it('should initialize provider with decrypted credentials', async () => {
        const channelAccount = createTestChannelAccount();
        mockChannelAccountRepo.findByIdAndTenant.mockResolvedValue(channelAccount);

        await service.submitTemplate(tenantId, templateGroupId, translationId);

        expect(mockCredentialService.decryptCredentials).toHaveBeenCalledWith(
          channelAccount.encryptedCredentials,
          channelAccount.credentialsIv
        );
        expect(mockProvider.initialize).toHaveBeenCalled();
      });

      it('should transform template to Meta format', async () => {
        const templateGroup = createTestTemplateGroup();
        mockTemplateRepo.findById.mockResolvedValue(templateGroup);

        await service.submitTemplate(tenantId, templateGroupId, translationId);

        expect(mockTransformer.transformToMetaFormat).toHaveBeenCalledWith(
          templateGroup,
          templateGroup.translations![0]
        );
      });

      it('should call provider.createTemplate with transformed request', async () => {
        const metaRequest = createTestMetaRequest();
        mockTransformer.transformToMetaFormat.mockReturnValue(metaRequest);

        await service.submitTemplate(tenantId, templateGroupId, translationId);

        expect(mockProvider.createTemplate).toHaveBeenCalledWith(metaRequest);
      });

      it('should update translation with meta template id on success', async () => {
        await service.submitTemplate(tenantId, templateGroupId, translationId);

        expect(mockTemplateRepo.updateTranslation).toHaveBeenCalledWith(
          translationId,
          { metaTemplateId }
        );
      });

      it('should emit SSE event on successful submission', async () => {
        await service.submitTemplate(tenantId, templateGroupId, translationId);

        expect(mockSseService.emitToTenant).toHaveBeenCalledWith(
          tenantId,
          'template:status:changed',
          expect.objectContaining({
            templateGroupId,
            translationId,
            status: 'pending',
            metaTemplateId,
          })
        );
      });
    });

    describe('Meta API error handling', () => {
      beforeEach(() => {
        // Setup mocks up to API call
        const templateGroup = createTestTemplateGroup();
        const channelAccount = createTestChannelAccount();
        const metaRequest = createTestMetaRequest();

        mockTemplateRepo.findById.mockResolvedValue(templateGroup);
        mockChannelAccountRepo.findByIdAndTenant.mockResolvedValue(channelAccount);
        mockCredentialService.decryptCredentials.mockResolvedValue({});
        mockTransformer.transformToMetaFormat.mockReturnValue(metaRequest);
      });

      it('should return error with retryable flag from Meta response', async () => {
        const metaError: CreateMetaTemplateResponse = {
          success: false,
          error: {
            code: '4',
            message: 'Rate limit exceeded',
            retryable: true,
          },
        };
        mockProvider.createTemplate.mockResolvedValue(metaError);

        const result = await service.submitTemplate(tenantId, templateGroupId, translationId);

        expect(result).toEqual<SubmissionResult>({
          success: false,
          error: {
            code: '4',
            message: 'Rate limit exceeded',
            retryable: true,
          },
        });
      });

      it('should mark translation as REJECTED for non-retryable errors', async () => {
        const metaError: CreateMetaTemplateResponse = {
          success: false,
          error: {
            code: '2388026',
            message: 'Duplicate template name',
            retryable: false,
          },
        };
        mockProvider.createTemplate.mockResolvedValue(metaError);

        await service.submitTemplate(tenantId, templateGroupId, translationId);

        expect(mockTemplateRepo.updateTranslation).toHaveBeenCalledWith(
          translationId,
          {
            status: TemplateStatus.REJECTED,
            rejectionReason: 'Duplicate template name',
          }
        );
      });

      it('should emit SSE event for non-retryable error', async () => {
        const metaError: CreateMetaTemplateResponse = {
          success: false,
          error: {
            code: '100',
            message: 'Invalid parameter',
            retryable: false,
          },
        };
        mockProvider.createTemplate.mockResolvedValue(metaError);

        await service.submitTemplate(tenantId, templateGroupId, translationId);

        expect(mockSseService.emitTemplateStatusChange).toHaveBeenCalledWith(
          tenantId,
          'order_confirmation',
          'en',
          TemplateStatus.PENDING,
          TemplateStatus.REJECTED,
          'Invalid parameter'
        );
      });

      it('should NOT mark translation as rejected for retryable errors', async () => {
        const metaError: CreateMetaTemplateResponse = {
          success: false,
          error: {
            code: '2',
            message: 'Service temporarily unavailable',
            retryable: true,
          },
        };
        mockProvider.createTemplate.mockResolvedValue(metaError);

        await service.submitTemplate(tenantId, templateGroupId, translationId);

        expect(mockTemplateRepo.updateTranslation).not.toHaveBeenCalled();
      });

      it('should NOT emit SSE event for retryable errors', async () => {
        const metaError: CreateMetaTemplateResponse = {
          success: false,
          error: {
            code: '2',
            message: 'Service temporarily unavailable',
            retryable: true,
          },
        };
        mockProvider.createTemplate.mockResolvedValue(metaError);

        await service.submitTemplate(tenantId, templateGroupId, translationId);

        expect(mockSseService.emitTemplateStatusChange).not.toHaveBeenCalled();
        expect(mockSseService.emitToTenant).not.toHaveBeenCalled();
      });
    });

    describe('provider factory integration', () => {
      it('should create meta_cloud_api provider', async () => {
        const templateGroup = createTestTemplateGroup();
        const channelAccount = createTestChannelAccount();

        mockTemplateRepo.findById.mockResolvedValue(templateGroup);
        mockChannelAccountRepo.findByIdAndTenant.mockResolvedValue(channelAccount);
        mockCredentialService.decryptCredentials.mockResolvedValue({});
        mockTransformer.transformToMetaFormat.mockReturnValue(createTestMetaRequest());
        mockProvider.createTemplate.mockResolvedValue({ success: true, id: 'test' });

        await service.submitTemplate(tenantId, templateGroupId, translationId);

        expect(mockProviderFactory.createProviderForWebhook).toHaveBeenCalledWith('meta_cloud_api');
      });
    });

    describe('edge cases', () => {
      it('should handle translation with existing metaTemplateId (re-submission)', async () => {
        const templateGroup = createTestTemplateGroup(
          {},
          { metaTemplateId: 'old-meta-id' }
        );
        const channelAccount = createTestChannelAccount();

        mockTemplateRepo.findById.mockResolvedValue(templateGroup);
        mockChannelAccountRepo.findByIdAndTenant.mockResolvedValue(channelAccount);
        mockCredentialService.decryptCredentials.mockResolvedValue({});
        mockTransformer.transformToMetaFormat.mockReturnValue(createTestMetaRequest());
        mockProvider.createTemplate.mockResolvedValue({
          success: true,
          id: 'new-meta-id',
        });

        const result = await service.submitTemplate(tenantId, templateGroupId, translationId);

        expect(result.success).toBe(true);
        expect(result.metaTemplateId).toBe('new-meta-id');
        expect(mockTemplateRepo.updateTranslation).toHaveBeenCalledWith(
          translationId,
          { metaTemplateId: 'new-meta-id' }
        );
      });

      it('should handle multiple translations and find correct one', async () => {
        const otherTranslation: TemplateTranslation = {
          id: 'other-translation-id',
          templateGroupId,
          language: 'es',
          status: TemplateStatus.APPROVED,
          quality: null,
          headerType: null,
          headerContent: null,
          body: 'Hola',
          footer: null,
          buttons: [],
          rejectionReason: null,
          metaTemplateId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          templateGroup: null as any,
        };

        const targetTranslation: TemplateTranslation = {
          id: translationId,
          templateGroupId,
          language: 'en',
          status: TemplateStatus.PENDING,
          quality: null,
          headerType: HeaderType.TEXT,
          headerContent: 'Hello!',
          body: 'Hello World',
          footer: null,
          buttons: [],
          rejectionReason: null,
          metaTemplateId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          templateGroup: null as any,
        };

        const templateGroup = createTestTemplateGroup();
        templateGroup.translations = [otherTranslation, targetTranslation];

        const channelAccount = createTestChannelAccount();

        mockTemplateRepo.findById.mockResolvedValue(templateGroup);
        mockChannelAccountRepo.findByIdAndTenant.mockResolvedValue(channelAccount);
        mockCredentialService.decryptCredentials.mockResolvedValue({});
        mockTransformer.transformToMetaFormat.mockReturnValue(createTestMetaRequest());
        mockProvider.createTemplate.mockResolvedValue({ success: true, id: metaTemplateId });

        await service.submitTemplate(tenantId, templateGroupId, translationId);

        // Verify transformer was called with the correct translation (en, not es)
        expect(mockTransformer.transformToMetaFormat).toHaveBeenCalledWith(
          templateGroup,
          targetTranslation
        );
      });
    });
  });
});
