"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateSubmissionService = exports.SubmissionErrorCodes = void 0;
const tsyringe_1 = require("tsyringe");
const template_repository_1 = require("../template.repository");
const template_transformer_service_1 = require("./template-transformer.service");
const template_sse_service_1 = require("../template-sse.service");
const provider_factory_1 = require("../../messaging/provider-factory");
const credential_service_1 = require("../../messaging/services/credential.service");
const channel_account_repository_1 = require("../../channel-accounts/channel-account.repository");
const enums_1 = require("../enums");
const logger_config_1 = require("../../../config/logger.config");
const meta_cloud_api_provider_1 = require("../../messaging/providers/meta-cloud-api.provider");
/**
 * Type guard to check if provider supports template creation.
 */
function isMetaCloudApiProvider(provider) {
    return provider.providerCode === 'meta_cloud_api'
        && typeof provider.createTemplate === 'function';
}
/**
 * Error codes for template submission failures.
 */
exports.SubmissionErrorCodes = {
    TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
    TRANSLATION_NOT_FOUND: 'TRANSLATION_NOT_FOUND',
    NO_CHANNEL_ACCOUNT: 'NO_CHANNEL_ACCOUNT',
    CHANNEL_ACCOUNT_NOT_FOUND: 'CHANNEL_ACCOUNT_NOT_FOUND',
};
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
let TemplateSubmissionService = class TemplateSubmissionService {
    templateRepo;
    transformer;
    sseService;
    providerFactory;
    credentialService;
    channelAccountRepo;
    constructor(templateRepo, transformer, sseService, providerFactory, credentialService, channelAccountRepo) {
        this.templateRepo = templateRepo;
        this.transformer = transformer;
        this.sseService = sseService;
        this.providerFactory = providerFactory;
        this.credentialService = credentialService;
        this.channelAccountRepo = channelAccountRepo;
    }
    /**
     * Submit a template translation to Meta for approval.
     *
     * @param tenantId - The tenant ID for multi-tenancy isolation
     * @param templateGroupId - The template group UUID
     * @param translationId - The specific translation UUID to submit
     * @returns Submission result with success/error details
     */
    async submitTemplate(tenantId, templateGroupId, translationId) {
        logger_config_1.logger.info('Submitting template to Meta', {
            tenantId,
            templateGroupId,
            translationId,
        });
        // 1. Load template with translations
        const template = await this.templateRepo.findById(tenantId, templateGroupId);
        if (!template) {
            logger_config_1.logger.warn('Template group not found for submission', {
                tenantId,
                templateGroupId,
            });
            return this.createError(exports.SubmissionErrorCodes.TEMPLATE_NOT_FOUND, `Template group ${templateGroupId} not found`, false);
        }
        // 2. Find the specific translation
        const translation = template.translations?.find((t) => t.id === translationId);
        if (!translation) {
            logger_config_1.logger.warn('Translation not found for submission', {
                tenantId,
                templateGroupId,
                translationId,
                availableTranslations: template.translations?.map((t) => t.id) || [],
            });
            return this.createError(exports.SubmissionErrorCodes.TRANSLATION_NOT_FOUND, `Translation ${translationId} not found in template group`, false);
        }
        // 3. Verify channel account exists
        if (!template.channelAccountId) {
            logger_config_1.logger.warn('Template has no channel account', {
                tenantId,
                templateGroupId,
            });
            return this.createError(exports.SubmissionErrorCodes.NO_CHANNEL_ACCOUNT, 'Template group has no associated channel account', false);
        }
        const channelAccount = await this.channelAccountRepo.findByIdAndTenant(template.channelAccountId, tenantId);
        if (!channelAccount) {
            logger_config_1.logger.warn('Channel account not found', {
                tenantId,
                channelAccountId: template.channelAccountId,
            });
            return this.createError(exports.SubmissionErrorCodes.CHANNEL_ACCOUNT_NOT_FOUND, `Channel account ${template.channelAccountId} not found`, false);
        }
        // 4. Initialize provider with credentials
        const provider = this.providerFactory.createProviderForWebhook(meta_cloud_api_provider_1.MetaCloudApiProvider.prototype.providerCode);
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
        const credentials = await this.credentialService.decryptCredentials(channelAccount.encryptedCredentials, channelAccount.credentialsIv);
        await provider.initialize(credentials);
        // 5. Transform to Meta format
        const metaRequest = this.transformer.transformToMetaFormat(template, translation);
        logger_config_1.logger.debug('Transformed template for Meta submission', {
            templateName: metaRequest.name,
            language: metaRequest.language,
            category: metaRequest.category,
            componentCount: metaRequest.components.length,
        });
        // 6. Submit to Meta API
        const response = await provider.createTemplate(metaRequest);
        // 7. Handle response
        if (response.success && response.id) {
            return this.handleSuccess(tenantId, templateGroupId, translationId, template.name, translation.language, response.id);
        }
        const error = response.error ?? {
            code: 'UNKNOWN_ERROR',
            message: 'Template submission failed with unknown error',
            retryable: false,
        };
        return this.handleError(tenantId, templateGroupId, translationId, template.name, translation.language, translation.status, error);
    }
    /**
     * Handle successful template submission.
     */
    async handleSuccess(tenantId, templateGroupId, translationId, templateName, language, metaTemplateId) {
        // Update translation with Meta template ID
        await this.templateRepo.updateTranslation(translationId, { metaTemplateId });
        // Emit SSE event for real-time UI update
        this.sseService.emitToTenant(tenantId, 'template:status:changed', {
            templateGroupId,
            translationId,
            status: enums_1.TemplateStatus.PENDING,
            metaTemplateId,
            timestamp: new Date().toISOString(),
        });
        // Audit log for compliance
        logger_config_1.auditLogger.info('Template submitted to Meta successfully', {
            tenantId,
            templateGroupId,
            translationId,
            templateName,
            language,
            metaTemplateId,
            action: 'template:submit:success',
        });
        logger_config_1.logger.info('Template submission successful', {
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
    async handleError(tenantId, templateGroupId, translationId, templateName, language, currentStatus, error) {
        if (!error.retryable) {
            // Mark translation as rejected for permanent failures
            await this.templateRepo.updateTranslation(translationId, {
                status: enums_1.TemplateStatus.REJECTED,
                rejectionReason: error.message,
            });
            // Emit SSE event for UI update
            this.sseService.emitTemplateStatusChange(tenantId, templateName, language, currentStatus, enums_1.TemplateStatus.REJECTED, error.message);
            // Audit log for compliance
            logger_config_1.auditLogger.error('Template submission rejected by Meta', {
                tenantId,
                templateGroupId,
                translationId,
                templateName,
                language,
                errorCode: error.code,
                errorMessage: error.message,
                action: 'template:submit:rejected',
            });
            logger_config_1.logger.error('Template submission failed (non-retryable)', {
                tenantId,
                templateGroupId,
                translationId,
                errorCode: error.code,
                errorMessage: error.message,
            });
        }
        else {
            // Log retryable error without modifying state
            logger_config_1.logger.warn('Template submission failed (retryable)', {
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
    createError(code, message, retryable) {
        return {
            success: false,
            error: {
                code,
                message,
                retryable,
            },
        };
    }
};
exports.TemplateSubmissionService = TemplateSubmissionService;
exports.TemplateSubmissionService = TemplateSubmissionService = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(template_repository_1.TemplateRepository)),
    __param(1, (0, tsyringe_1.inject)(template_transformer_service_1.TemplateTransformerService)),
    __param(2, (0, tsyringe_1.inject)(template_sse_service_1.TemplateSseService)),
    __param(3, (0, tsyringe_1.inject)(provider_factory_1.ProviderFactory)),
    __param(4, (0, tsyringe_1.inject)(credential_service_1.CredentialService)),
    __param(5, (0, tsyringe_1.inject)(channel_account_repository_1.ChannelAccountRepository)),
    __metadata("design:paramtypes", [template_repository_1.TemplateRepository,
        template_transformer_service_1.TemplateTransformerService,
        template_sse_service_1.TemplateSseService,
        provider_factory_1.ProviderFactory,
        credential_service_1.CredentialService,
        channel_account_repository_1.ChannelAccountRepository])
], TemplateSubmissionService);
