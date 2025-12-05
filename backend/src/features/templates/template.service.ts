import { singleton, inject } from 'tsyringe';
import { v4 as uuidv4 } from 'uuid';
import { TemplateRepository, TemplateQueryOptions, PaginatedResult } from './template.repository';
import { WhatsAppTemplateGroup } from './template-group.entity';
import { TemplateTranslation, TemplateButton } from './template-translation.entity';
import { CreateTemplateGroupDto } from './dto/create-template-group.dto';
import { UpdateTemplateGroupDto } from './dto/update-template-group.dto';
import { CreateTranslationDto } from './dto/create-translation.dto';
import { UpdateTranslationDto } from './dto/update-translation.dto';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '../../shared/exceptions/http-exceptions';
import { auditLogger } from '../../config/logger.config';

@singleton()
export class TemplateService {
  constructor(
    @inject(TemplateRepository) private templateRepository: TemplateRepository
  ) {}

  /**
   * List all templates for a tenant with pagination and filtering.
   */
  async listTemplates(
    tenantId: string,
    options: TemplateQueryOptions
  ): Promise<PaginatedResult<WhatsAppTemplateGroup>> {
    return this.templateRepository.findAll(tenantId, options);
  }

  /**
   * Get a single template with all its translations.
   */
  async getTemplate(tenantId: string, id: string): Promise<WhatsAppTemplateGroup> {
    const template = await this.templateRepository.findById(tenantId, id);
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return template;
  }

  /**
   * Get templates that have at least one approved translation.
   */
  async getApprovedTemplates(
    tenantId: string,
    options: TemplateQueryOptions
  ): Promise<PaginatedResult<WhatsAppTemplateGroup>> {
    return this.templateRepository.findApproved(tenantId, options);
  }

  /**
   * Create a new template group.
   */
  async createTemplate(
    dto: CreateTemplateGroupDto,
    tenantId: string
  ): Promise<WhatsAppTemplateGroup> {
    // Check for duplicate template name within the same channel account
    const exists = await this.templateRepository.existsByName(
      dto.name,
      tenantId,
      undefined,
      dto.channelAccountId || null
    );
    if (exists) {
      throw new ConflictException('Template with this name already exists for this channel account');
    }

    const template = await this.templateRepository.create({
      name: dto.name,
      category: dto.category,
      customFields: dto.customFields || {},
      tenantId,
      channelAccountId: dto.channelAccountId || null,
    });

    auditLogger.info('Template created', {
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
  async updateTemplate(
    id: string,
    dto: UpdateTemplateGroupDto,
    tenantId: string
  ): Promise<WhatsAppTemplateGroup> {
    const template = await this.getTemplate(tenantId, id);

    // Check for duplicate name if being updated
    if (dto.name && dto.name !== template.name) {
      const exists = await this.templateRepository.existsByName(
        dto.name,
        tenantId,
        id,
        template.channelAccountId
      );
      if (exists) {
        throw new ConflictException('Template with this name already exists for this channel account');
      }
    }

    const updateData: Partial<WhatsAppTemplateGroup> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.customFields !== undefined) {
      // Merge custom fields instead of replacing
      updateData.customFields = {
        ...template.customFields,
        ...dto.customFields,
      };
    }

    const updated = await this.templateRepository.update(id, tenantId, updateData);
    if (!updated) {
      throw new NotFoundException('Template not found');
    }

    auditLogger.info('Template updated', {
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
  async deleteTemplate(id: string, tenantId: string): Promise<void> {
    const template = await this.getTemplate(tenantId, id);

    const deleted = await this.templateRepository.delete(id, tenantId);
    if (!deleted) {
      throw new NotFoundException('Template not found');
    }

    auditLogger.info('Template deleted', {
      action: 'template.delete',
      tenantId,
      templateId: id,
      templateName: template.name,
    });
  }

  /**
   * Add a translation to a template group.
   */
  async addTranslation(
    templateId: string,
    dto: CreateTranslationDto,
    tenantId: string
  ): Promise<TemplateTranslation> {
    // Verify template exists and belongs to tenant
    const template = await this.getTemplate(tenantId, templateId);

    // Check if translation for this language already exists
    const exists = await this.templateRepository.existsTranslationByLanguage(
      templateId,
      dto.language
    );
    if (exists) {
      throw new ConflictException(
        `Translation for language '${dto.language}' already exists`
      );
    }

    // Transform buttons with IDs
    const buttons: TemplateButton[] = (dto.buttons || []).map((btn) => ({
      id: uuidv4(),
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

    auditLogger.info('Translation added', {
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
  async updateTranslation(
    templateId: string,
    translationId: string,
    dto: UpdateTranslationDto,
    tenantId: string
  ): Promise<TemplateTranslation> {
    // Verify template exists and belongs to tenant
    await this.getTemplate(tenantId, templateId);

    // Verify translation exists and belongs to this template
    const translation = await this.templateRepository.findTranslationById(translationId);
    if (!translation) {
      throw new NotFoundException('Translation not found');
    }
    if (translation.templateGroupId !== templateId) {
      throw new BadRequestException('Translation does not belong to this template');
    }

    const updateData: Partial<TemplateTranslation> = {};
    if (dto.headerType !== undefined) updateData.headerType = dto.headerType;
    if (dto.headerContent !== undefined) updateData.headerContent = dto.headerContent;
    if (dto.body !== undefined) updateData.body = dto.body;
    if (dto.footer !== undefined) updateData.footer = dto.footer;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.quality !== undefined) updateData.quality = dto.quality;
    if (dto.rejectionReason !== undefined) updateData.rejectionReason = dto.rejectionReason;
    if (dto.buttons !== undefined) {
      // Generate IDs for new buttons
      updateData.buttons = dto.buttons.map((btn) => ({
        id: uuidv4(),
        type: btn.type,
        text: btn.text,
        url: btn.url,
        phoneNumber: btn.phoneNumber,
      }));
    }

    const updated = await this.templateRepository.updateTranslation(translationId, updateData);
    if (!updated) {
      throw new NotFoundException('Translation not found');
    }

    auditLogger.info('Translation updated', {
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
  async deleteTranslation(
    templateId: string,
    translationId: string,
    tenantId: string
  ): Promise<void> {
    // Verify template exists and belongs to tenant
    await this.getTemplate(tenantId, templateId);

    // Verify translation exists and belongs to this template
    const translation = await this.templateRepository.findTranslationById(translationId);
    if (!translation) {
      throw new NotFoundException('Translation not found');
    }
    if (translation.templateGroupId !== templateId) {
      throw new BadRequestException('Translation does not belong to this template');
    }

    const deleted = await this.templateRepository.deleteTranslation(translationId);
    if (!deleted) {
      throw new NotFoundException('Translation not found');
    }

    auditLogger.info('Translation deleted', {
      action: 'template.translation.delete',
      tenantId,
      templateId,
      translationId,
      language: translation.language,
    });
  }
}
