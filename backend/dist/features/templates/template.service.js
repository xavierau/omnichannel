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
exports.TemplateService = void 0;
const tsyringe_1 = require("tsyringe");
const uuid_1 = require("uuid");
const template_repository_1 = require("./template.repository");
const http_exceptions_1 = require("../../shared/exceptions/http-exceptions");
const logger_config_1 = require("../../config/logger.config");
const channel_account_repository_1 = require("../channel-accounts/channel-account.repository");
const template_submission_queue_interface_1 = require("../../jobs/interfaces/template-submission-queue.interface");
const enums_1 = require("./enums");
let TemplateService = class TemplateService {
    templateRepository;
    channelAccountRepository;
    submissionQueue;
    constructor(templateRepository, channelAccountRepository, submissionQueue) {
        this.templateRepository = templateRepository;
        this.channelAccountRepository = channelAccountRepository;
        this.submissionQueue = submissionQueue;
    }
    /**
     * List all templates for a tenant with pagination and filtering.
     */
    async listTemplates(tenantId, options) {
        return this.templateRepository.findAll(tenantId, options);
    }
    /**
     * Get a single template with all its translations.
     */
    async getTemplate(tenantId, id) {
        const template = await this.templateRepository.findById(tenantId, id);
        if (!template) {
            throw new http_exceptions_1.NotFoundException('Template not found');
        }
        return template;
    }
    /**
     * Get templates that have at least one approved translation.
     */
    async getApprovedTemplates(tenantId, options) {
        return this.templateRepository.findApproved(tenantId, options);
    }
    /**
     * Create a new template group.
     * Validates channel account ownership before creation.
     */
    async createTemplate(dto, tenantId) {
        // CRITICAL: Validate channel account belongs to the tenant if provided
        if (dto.channelAccountId) {
            const channelAccount = await this.channelAccountRepository.findByIdAndTenant(dto.channelAccountId, tenantId);
            if (!channelAccount) {
                throw new http_exceptions_1.ForbiddenException('Channel account does not exist or does not belong to this tenant');
            }
        }
        // Check for duplicate template name within the same channel account
        const exists = await this.templateRepository.existsByName(dto.name, tenantId, undefined, dto.channelAccountId || null);
        if (exists) {
            throw new http_exceptions_1.ConflictException('Template with this name already exists for this channel account');
        }
        const template = await this.templateRepository.create({
            name: dto.name,
            category: dto.category,
            customFields: dto.customFields || {},
            tenantId,
            channelAccountId: dto.channelAccountId || null,
        });
        logger_config_1.auditLogger.info('Template created', {
            action: 'template.create',
            tenantId,
            templateId: template.id,
            templateName: template.name,
            category: template.category,
            channelAccountId: dto.channelAccountId,
        });
        return template;
    }
    /**
     * Update a template group.
     */
    async updateTemplate(id, dto, tenantId) {
        const template = await this.getTemplate(tenantId, id);
        // Check for duplicate name if being updated
        if (dto.name && dto.name !== template.name) {
            const exists = await this.templateRepository.existsByName(dto.name, tenantId, id, template.channelAccountId);
            if (exists) {
                throw new http_exceptions_1.ConflictException('Template with this name already exists for this channel account');
            }
        }
        const updateData = {};
        if (dto.name !== undefined)
            updateData.name = dto.name;
        if (dto.category !== undefined)
            updateData.category = dto.category;
        if (dto.customFields !== undefined) {
            // Merge custom fields instead of replacing
            updateData.customFields = {
                ...template.customFields,
                ...dto.customFields,
            };
        }
        const updated = await this.templateRepository.update(id, tenantId, updateData);
        if (!updated) {
            throw new http_exceptions_1.NotFoundException('Template not found');
        }
        logger_config_1.auditLogger.info('Template updated', {
            action: 'template.update',
            tenantId,
            templateId: id,
            changes: Object.keys(dto),
        });
        return updated;
    }
    /**
     * Delete a template group and all its translations.
     */
    async deleteTemplate(id, tenantId) {
        const template = await this.getTemplate(tenantId, id);
        const deleted = await this.templateRepository.delete(id, tenantId);
        if (!deleted) {
            throw new http_exceptions_1.NotFoundException('Template not found');
        }
        logger_config_1.auditLogger.info('Template deleted', {
            action: 'template.delete',
            tenantId,
            templateId: id,
            templateName: template.name,
        });
    }
    /**
     * Add a translation to a template group.
     * If the template has a channel account configured, automatically queues
     * the translation for submission to Meta.
     */
    async addTranslation(templateId, dto, tenantId) {
        // Verify template exists and belongs to tenant (reuse for channel account check)
        const template = await this.getTemplate(tenantId, templateId);
        // Check if translation for this language already exists
        const exists = await this.templateRepository.existsTranslationByLanguage(templateId, dto.language);
        if (exists) {
            throw new http_exceptions_1.ConflictException(`Translation for language '${dto.language}' already exists`);
        }
        // Transform buttons with IDs
        const buttons = (dto.buttons || []).map((btn) => ({
            id: (0, uuid_1.v4)(),
            type: btn.type,
            text: btn.text,
            url: btn.url,
            phoneNumber: btn.phoneNumber,
        }));
        const translation = await this.templateRepository.addTranslation({
            templateGroupId: templateId,
            language: dto.language,
            headerType: dto.headerType,
            headerContent: dto.headerContent,
            body: dto.body,
            footer: dto.footer,
            buttons,
        });
        // Queue for Meta submission if channel account is configured
        if (template.channelAccountId) {
            await this.submissionQueue.queueSubmission({
                tenantId,
                templateGroupId: templateId,
                translationId: translation.id,
            });
        }
        logger_config_1.auditLogger.info('Translation added', {
            action: 'template.translation.add',
            tenantId,
            templateId,
            translationId: translation.id,
            language: dto.language,
        });
        return translation;
    }
    /**
     * Update a translation.
     */
    async updateTranslation(templateId, translationId, dto, tenantId) {
        // Verify template exists and belongs to tenant
        await this.getTemplate(tenantId, templateId);
        // Verify translation exists and belongs to this template
        const translation = await this.templateRepository.findTranslationById(translationId);
        if (!translation) {
            throw new http_exceptions_1.NotFoundException('Translation not found');
        }
        if (translation.templateGroupId !== templateId) {
            throw new http_exceptions_1.BadRequestException('Translation does not belong to this template');
        }
        const updateData = {};
        if (dto.headerType !== undefined)
            updateData.headerType = dto.headerType;
        if (dto.headerContent !== undefined)
            updateData.headerContent = dto.headerContent;
        if (dto.body !== undefined)
            updateData.body = dto.body;
        if (dto.footer !== undefined)
            updateData.footer = dto.footer;
        if (dto.status !== undefined)
            updateData.status = dto.status;
        if (dto.quality !== undefined)
            updateData.quality = dto.quality;
        if (dto.rejectionReason !== undefined)
            updateData.rejectionReason = dto.rejectionReason;
        if (dto.buttons !== undefined) {
            // Generate IDs for new buttons
            updateData.buttons = dto.buttons.map((btn) => ({
                id: (0, uuid_1.v4)(),
                type: btn.type,
                text: btn.text,
                url: btn.url,
                phoneNumber: btn.phoneNumber,
            }));
        }
        const updated = await this.templateRepository.updateTranslation(translationId, updateData);
        if (!updated) {
            throw new http_exceptions_1.NotFoundException('Translation not found');
        }
        logger_config_1.auditLogger.info('Translation updated', {
            action: 'template.translation.update',
            tenantId,
            templateId,
            translationId,
            changes: Object.keys(dto),
        });
        return updated;
    }
    /**
     * Delete a translation.
     */
    async deleteTranslation(templateId, translationId, tenantId) {
        // Verify template exists and belongs to tenant
        await this.getTemplate(tenantId, templateId);
        // Verify translation exists and belongs to this template
        const translation = await this.templateRepository.findTranslationById(translationId);
        if (!translation) {
            throw new http_exceptions_1.NotFoundException('Translation not found');
        }
        if (translation.templateGroupId !== templateId) {
            throw new http_exceptions_1.BadRequestException('Translation does not belong to this template');
        }
        const deleted = await this.templateRepository.deleteTranslation(translationId);
        if (!deleted) {
            throw new http_exceptions_1.NotFoundException('Translation not found');
        }
        logger_config_1.auditLogger.info('Translation deleted', {
            action: 'template.translation.delete',
            tenantId,
            templateId,
            translationId,
            language: translation.language,
        });
    }
    /**
     * Manually trigger template submission to Meta.
     * Used for re-submitting rejected templates.
     */
    async submitToMeta(templateId, translationId, tenantId) {
        const template = await this.getTemplate(tenantId, templateId);
        if (!template.channelAccountId) {
            throw new http_exceptions_1.BadRequestException('Template must be associated with a channel account for submission');
        }
        const translation = template.translations?.find((t) => t.id === translationId);
        if (!translation) {
            throw new http_exceptions_1.NotFoundException('Translation not found');
        }
        // Reset status to pending if previously rejected
        if (translation.status === enums_1.TemplateStatus.REJECTED) {
            await this.templateRepository.updateTranslation(translationId, {
                status: enums_1.TemplateStatus.PENDING,
                rejectionReason: null,
            });
        }
        await this.submissionQueue.queueSubmission({
            tenantId,
            templateGroupId: templateId,
            translationId,
        });
        logger_config_1.auditLogger.info('Template submission queued manually', {
            action: 'template.submit.manual',
            tenantId,
            templateId,
            translationId,
            language: translation.language,
        });
    }
};
exports.TemplateService = TemplateService;
exports.TemplateService = TemplateService = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(template_repository_1.TemplateRepository)),
    __param(1, (0, tsyringe_1.inject)(channel_account_repository_1.ChannelAccountRepository)),
    __param(2, (0, tsyringe_1.inject)(template_submission_queue_interface_1.ITemplateSubmissionQueue)),
    __metadata("design:paramtypes", [template_repository_1.TemplateRepository,
        channel_account_repository_1.ChannelAccountRepository, Object])
], TemplateService);
