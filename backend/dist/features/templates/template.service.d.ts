import { TemplateRepository, TemplateQueryOptions, PaginatedResult } from './template.repository';
import { WhatsAppTemplateGroup } from './template-group.entity';
import { TemplateTranslation } from './template-translation.entity';
import { CreateTemplateGroupDto } from './dto/create-template-group.dto';
import { UpdateTemplateGroupDto } from './dto/update-template-group.dto';
import { CreateTranslationDto } from './dto/create-translation.dto';
import { UpdateTranslationDto } from './dto/update-translation.dto';
import { ChannelAccountRepository } from '../channel-accounts/channel-account.repository';
export declare class TemplateService {
    private templateRepository;
    private channelAccountRepository;
    constructor(templateRepository: TemplateRepository, channelAccountRepository: ChannelAccountRepository);
    /**
     * List all templates for a tenant with pagination and filtering.
     */
    listTemplates(tenantId: string, options: TemplateQueryOptions): Promise<PaginatedResult<WhatsAppTemplateGroup>>;
    /**
     * Get a single template with all its translations.
     */
    getTemplate(tenantId: string, id: string): Promise<WhatsAppTemplateGroup>;
    /**
     * Get templates that have at least one approved translation.
     */
    getApprovedTemplates(tenantId: string, options: TemplateQueryOptions): Promise<PaginatedResult<WhatsAppTemplateGroup>>;
    /**
     * Create a new template group.
     * Validates channel account ownership before creation.
     */
    createTemplate(dto: CreateTemplateGroupDto, tenantId: string): Promise<WhatsAppTemplateGroup>;
    /**
     * Update a template group.
     */
    updateTemplate(id: string, dto: UpdateTemplateGroupDto, tenantId: string): Promise<WhatsAppTemplateGroup>;
    /**
     * Delete a template group and all its translations.
     */
    deleteTemplate(id: string, tenantId: string): Promise<void>;
    /**
     * Add a translation to a template group.
     */
    addTranslation(templateId: string, dto: CreateTranslationDto, tenantId: string): Promise<TemplateTranslation>;
    /**
     * Update a translation.
     */
    updateTranslation(templateId: string, translationId: string, dto: UpdateTranslationDto, tenantId: string): Promise<TemplateTranslation>;
    /**
     * Delete a translation.
     */
    deleteTranslation(templateId: string, translationId: string, tenantId: string): Promise<void>;
}
