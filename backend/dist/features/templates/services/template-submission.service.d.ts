import { TemplateRepository } from '../template.repository';
import { TemplateTransformerService } from './template-transformer.service';
import { TemplateSseService } from '../template-sse.service';
import { ProviderFactory } from '../../messaging/provider-factory';
import { CredentialService } from '../../messaging/services/credential.service';
import { ChannelAccountRepository } from '../../channel-accounts/channel-account.repository';
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
export declare const SubmissionErrorCodes: {
    readonly TEMPLATE_NOT_FOUND: "TEMPLATE_NOT_FOUND";
    readonly TRANSLATION_NOT_FOUND: "TRANSLATION_NOT_FOUND";
    readonly NO_CHANNEL_ACCOUNT: "NO_CHANNEL_ACCOUNT";
    readonly CHANNEL_ACCOUNT_NOT_FOUND: "CHANNEL_ACCOUNT_NOT_FOUND";
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
export declare class TemplateSubmissionService {
    private templateRepo;
    private transformer;
    private sseService;
    private providerFactory;
    private credentialService;
    private channelAccountRepo;
    constructor(templateRepo: TemplateRepository, transformer: TemplateTransformerService, sseService: TemplateSseService, providerFactory: ProviderFactory, credentialService: CredentialService, channelAccountRepo: ChannelAccountRepository);
    /**
     * Submit a template translation to Meta for approval.
     *
     * @param tenantId - The tenant ID for multi-tenancy isolation
     * @param templateGroupId - The template group UUID
     * @param translationId - The specific translation UUID to submit
     * @returns Submission result with success/error details
     */
    submitTemplate(tenantId: string, templateGroupId: string, translationId: string): Promise<SubmissionResult>;
    /**
     * Handle successful template submission.
     */
    private handleSuccess;
    /**
     * Handle failed template submission.
     *
     * For non-retryable errors, marks the translation as REJECTED and emits SSE.
     * For retryable errors, returns error without modifying state (queue will retry).
     */
    private handleError;
    /**
     * Create a standardized error result.
     */
    private createError;
}
