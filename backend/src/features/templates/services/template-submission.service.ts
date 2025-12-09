import { singleton, inject } from 'tsyringe';
import { TemplateRepository } from '../template.repository';
import { TemplateTransformerService } from './template-transformer.service';
import { TemplateSseService } from '../template-sse.service';
import { ProviderFactory } from '../../messaging/provider-factory';
import { CredentialService } from '../../messaging/services/credential.service';
import { ChannelAccountRepository } from '../../channel-accounts/channel-account.repository';
import { TemplateStatus } from '../enums';
import { logger, auditLogger } from '../../../config/logger.config';
import { MetaCloudApiProvider } from '../../messaging/providers/meta-cloud-api.provider';
import { IMessagingProvider } from '../../messaging/interfaces/messaging-provider.interface';

/**
 * Type guard to check if provider supports template creation.
 */
function isMetaCloudApiProvider(
  provider: IMessagingProvider
): provider is MetaCloudApiProvider {
  return provider.providerCode === 'meta_cloud_api'
    && typeof (provider as MetaCloudApiProvider).createTemplate === 'function';
}

/**
 * Result of a template submission operation.
 *
 * On success, contains the Meta template ID assigned by Meta's API.
 * On failure, contains structured error information for queue retry logic.
 */
export interface SubmissionResult {
  success: boolean;
  metaTemplateId?: string;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

/**
 * Error codes for template submission failures.
 */
export const SubmissionErrorCodes = {
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  TRANSLATION_NOT_FOUND: 'TRANSLATION_NOT_FOUND',
  NO_CHANNEL_ACCOUNT: 'NO_CHANNEL_ACCOUNT',
  CHANNEL_ACCOUNT_NOT_FOUND: 'CHANNEL_ACCOUNT_NOT_FOUND',
} as const;

/**
 * Service that orchestrates template submission to Meta's WhatsApp Business API.
 *
 * This service handles the full lifecycle of submitting a template translation:
 * 1. Loading and validating the template and translation
 * 2. Verifying the associated channel account exists
 * 3. Initializing the Meta Cloud API provider with credentials
 * 4. Transforming the local template format to Meta's API format
 * 5. Submitting to Meta and handling success/error responses
 * 6. Updating local state and emitting real-time notifications
 *
 * @remarks
 * - Templates are submitted per-translation (language variant)
 * - Non-retryable errors result in immediate REJECTED status
 * - Retryable errors are returned for queue retry logic
 * - SSE events are emitted for UI real-time updates
 */
@singleton()
export class TemplateSubmissionService {
  constructor(
    @inject(TemplateRepository) private templateRepo: TemplateRepository,
    @inject(TemplateTransformerService) private transformer: TemplateTransformerService,
    @inject(TemplateSseService) private sseService: TemplateSseService,
    @inject(ProviderFactory) private providerFactory: ProviderFactory,
    @inject(CredentialService) private credentialService: CredentialService,
    @inject(ChannelAccountRepository) private channelAccountRepo: ChannelAccountRepository
  ) {}

  /**
   * Submit a template translation to Meta for approval.
   *
   * @param tenantId - The tenant ID for multi-tenancy isolation
   * @param templateGroupId - The template group UUID
   * @param translationId - The specific translation UUID to submit
   * @returns Submission result with success/error details
   */
  async submitTemplate(
    tenantId: string,
    templateGroupId: string,
    translationId: string
  ): Promise<SubmissionResult> {
    logger.info('Submitting template to Meta', {
      tenantId,
      templateGroupId,
      translationId,
    });

    // 1. Load template with translations
    const template = await this.templateRepo.findById(tenantId, templateGroupId);
    if (!template) {
      logger.warn('Template group not found for submission', {
        tenantId,
        templateGroupId,
      });
      return this.createError(
        SubmissionErrorCodes.TEMPLATE_NOT_FOUND,
        `Template group ${templateGroupId} not found`,
        false
      );
    }

    // 2. Find the specific translation
    const translation = template.translations?.find((t) => t.id === translationId);
    if (!translation) {
      logger.warn('Translation not found for submission', {
        tenantId,
        templateGroupId,
        translationId,
        availableTranslations: template.translations?.map((t) => t.id) || [],
      });
      return this.createError(
        SubmissionErrorCodes.TRANSLATION_NOT_FOUND,
        `Translation ${translationId} not found in template group`,
        false
      );
    }

    // 3. Verify channel account exists
    if (!template.channelAccountId) {
      logger.warn('Template has no channel account', {
        tenantId,
        templateGroupId,
      });
      return this.createError(
        SubmissionErrorCodes.NO_CHANNEL_ACCOUNT,
        'Template group has no associated channel account',
        false
      );
    }

    const channelAccount = await this.channelAccountRepo.findByIdAndTenant(
      template.channelAccountId,
      tenantId
    );
    if (!channelAccount) {
      logger.warn('Channel account not found', {
        tenantId,
        channelAccountId: template.channelAccountId,
      });
      return this.createError(
        SubmissionErrorCodes.CHANNEL_ACCOUNT_NOT_FOUND,
        `Channel account ${template.channelAccountId} not found`,
        false
      );
    }

    // 4. Initialize provider with credentials
    const provider = this.providerFactory.createProviderForWebhook(
      MetaCloudApiProvider.prototype.providerCode
    );

    if (!isMetaCloudApiProvider(provider)) {
      return {
        success: false,
        error: {
          code: 'INVALID_PROVIDER',
          message: 'Provider does not support template creation',
          retryable: false,
        },
      };
    }

    const credentials = await this.credentialService.decryptCredentials(
      channelAccount.encryptedCredentials,
      channelAccount.credentialsIv
    );
    await provider.initialize(credentials);

    // 5. Transform to Meta format
    const metaRequest = this.transformer.transformToMetaFormat(template, translation);

    logger.debug('Transformed template for Meta submission', {
      templateName: metaRequest.name,
      language: metaRequest.language,
      category: metaRequest.category,
      componentCount: metaRequest.components.length,
    });

    // 6. Submit to Meta API
    const response = await provider.createTemplate(metaRequest);

    // 7. Handle response
    if (response.success && response.id) {
      return this.handleSuccess(
        tenantId,
        templateGroupId,
        translationId,
        template.name,
        translation.language,
        response.id
      );
    }

    const error = response.error ?? {
      code: 'UNKNOWN_ERROR',
      message: 'Template submission failed with unknown error',
      retryable: false,
    };
    return this.handleError(
      tenantId,
      templateGroupId,
      translationId,
      template.name,
      translation.language,
      translation.status,
      error
    );
  }

  /**
   * Handle successful template submission.
   */
  private async handleSuccess(
    tenantId: string,
    templateGroupId: string,
    translationId: string,
    templateName: string,
    language: string,
    metaTemplateId: string
  ): Promise<SubmissionResult> {
    // Update translation with Meta template ID
    await this.templateRepo.updateTranslation(translationId, { metaTemplateId });

    // Emit SSE event for real-time UI update
    this.sseService.emitToTenant(tenantId, 'template:status:changed', {
      templateGroupId,
      translationId,
      status: TemplateStatus.PENDING,
      metaTemplateId,
      timestamp: new Date().toISOString(),
    });

    // Audit log for compliance
    auditLogger.info('Template submitted to Meta successfully', {
      tenantId,
      templateGroupId,
      translationId,
      templateName,
      language,
      metaTemplateId,
      action: 'template:submit:success',
    });

    logger.info('Template submission successful', {
      tenantId,
      templateGroupId,
      translationId,
      metaTemplateId,
    });

    return {
      success: true,
      metaTemplateId,
    };
  }

  /**
   * Handle failed template submission.
   *
   * For non-retryable errors, marks the translation as REJECTED and emits SSE.
   * For retryable errors, returns error without modifying state (queue will retry).
   */
  private async handleError(
    tenantId: string,
    templateGroupId: string,
    translationId: string,
    templateName: string,
    language: string,
    currentStatus: TemplateStatus,
    error: { code: string; message: string; retryable: boolean }
  ): Promise<SubmissionResult> {
    if (!error.retryable) {
      // Mark translation as rejected for permanent failures
      await this.templateRepo.updateTranslation(translationId, {
        status: TemplateStatus.REJECTED,
        rejectionReason: error.message,
      });

      // Emit SSE event for UI update
      this.sseService.emitTemplateStatusChange(
        tenantId,
        templateName,
        language,
        currentStatus,
        TemplateStatus.REJECTED,
        error.message
      );

      // Audit log for compliance
      auditLogger.error('Template submission rejected by Meta', {
        tenantId,
        templateGroupId,
        translationId,
        templateName,
        language,
        errorCode: error.code,
        errorMessage: error.message,
        action: 'template:submit:rejected',
      });

      logger.error('Template submission failed (non-retryable)', {
        tenantId,
        templateGroupId,
        translationId,
        errorCode: error.code,
        errorMessage: error.message,
      });
    } else {
      // Log retryable error without modifying state
      logger.warn('Template submission failed (retryable)', {
        tenantId,
        templateGroupId,
        translationId,
        errorCode: error.code,
        errorMessage: error.message,
      });
    }

    return {
      success: false,
      error,
    };
  }

  /**
   * Create a standardized error result.
   */
  private createError(
    code: string,
    message: string,
    retryable: boolean
  ): SubmissionResult {
    return {
      success: false,
      error: {
        code,
        message,
        retryable,
      },
    };
  }
}
