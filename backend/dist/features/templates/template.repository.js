"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateRepository = void 0;
const tsyringe_1 = require("tsyringe");
const database_config_1 = require("../../config/database.config");
const template_group_entity_1 = require("./template-group.entity");
const template_translation_entity_1 = require("./template-translation.entity");
const enums_1 = require("./enums");
/**
 * Allowed sort columns for template queries.
 * Maps user-facing field names to database column names.
 * This serves as an allowlist to prevent SQL injection.
 */
const ALLOWED_SORT_COLUMNS = {
    name: 'name',
    category: 'category',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
};
/**
 * Default sort column if none specified or if invalid column provided.
 */
const DEFAULT_SORT_COLUMN = 'created_at';
/**
 * Validates and maps a sort column name to its database column.
 *
 * @param sortBy - The user-provided sort column name
 * @returns The safe database column name
 */
const getSafeSortColumn = (sortBy) => {
    if (!sortBy) {
        return DEFAULT_SORT_COLUMN;
    }
    return ALLOWED_SORT_COLUMNS[sortBy] ?? DEFAULT_SORT_COLUMN;
};
let TemplateRepository = class TemplateRepository {
    _groupRepository = null;
    _translationRepository = null;
    /**
     * Lazy initialization of the group repository to ensure AppDataSource is initialized.
     * This prevents errors when the DI container instantiates this class before
     * the database connection is established.
     */
    get groupRepository() {
        if (!this._groupRepository) {
            this._groupRepository = database_config_1.AppDataSource.getRepository(template_group_entity_1.WhatsAppTemplateGroup);
        }
        return this._groupRepository;
    }
    /**
     * Lazy initialization of the translation repository to ensure AppDataSource is initialized.
     */
    get translationRepository() {
        if (!this._translationRepository) {
            this._translationRepository = database_config_1.AppDataSource.getRepository(template_translation_entity_1.TemplateTranslation);
        }
        return this._translationRepository;
    }
    /**
     * Find all template groups for a tenant with pagination and filtering.
     *
     * Note: Uses separate queries for data and count to avoid TypeORM's
     * getManyAndCount() bug with nullable leftJoinAndSelect relations
     * that causes "Cannot read properties of undefined (reading 'databaseName')" error.
     */
    async findAll(tenantId, options = {}) {
        const { search, categories, statuses, channelAccountId, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', } = options;
        // Build base query conditions (without joins for counting)
        const baseQueryBuilder = () => {
            const qb = this.groupRepository
                .createQueryBuilder('template')
                .where('template.tenant_id = :tenantId', { tenantId });
            // Filter by channel account
            if (channelAccountId) {
                qb.andWhere('template.channel_account_id = :channelAccountId', { channelAccountId });
            }
            // Search by template name
            if (search) {
                qb.andWhere('LOWER(template.name) LIKE LOWER(:search)', {
                    search: `%${search}%`,
                });
            }
            // Filter by categories
            if (categories && categories.length > 0) {
                qb.andWhere('template.category IN (:...categories)', { categories });
            }
            // Filter by translation statuses (groups that have at least one translation with the status)
            if (statuses && statuses.length > 0) {
                qb.andWhere((subQb) => {
                    const subQuery = subQb
                        .subQuery()
                        .select('tt.template_group_id')
                        .from('template_translations', 'tt')
                        .where('tt.status IN (:...statuses)', { statuses })
                        .getQuery();
                    return `template.id IN ${subQuery}`;
                });
            }
            return qb;
        };
        // Get total count first (without joins or ordering)
        const total = await baseQueryBuilder().getCount();
        if (total === 0) {
            return {
                data: [],
                total: 0,
                page,
                limit,
                totalPages: 0,
            };
        }
        // Sorting - use allowlist to prevent SQL injection
        const sortColumn = getSafeSortColumn(sortBy);
        const order = (sortOrder || 'desc').toUpperCase();
        // Pagination - fetch IDs first to avoid TypeORM bug with skip/take on nullable joins
        const skipCount = (page - 1) * limit;
        const idsQuery = baseQueryBuilder()
            .select('template.id')
            .orderBy(`template.${sortColumn}`, order)
            .offset(skipCount)
            .limit(limit);
        const idResults = await idsQuery.getRawMany();
        const ids = idResults.map((r) => r.template_id);
        if (ids.length === 0) {
            return {
                data: [],
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        }
        // Fetch full entities by IDs (no pagination needed, just the specific IDs)
        const data = await this.groupRepository
            .createQueryBuilder('template')
            .leftJoinAndSelect('template.translations', 'translations')
            .leftJoinAndSelect('template.channelAccount', 'channelAccount')
            .where('template.id IN (:...ids)', { ids })
            .orderBy(`template.${sortColumn}`, order)
            .getMany();
        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Find a single template group by ID with all translations.
     */
    async findById(tenantId, id) {
        return this.groupRepository.findOne({
            where: { id, tenantId },
            relations: ['translations', 'channelAccount'],
        });
    }
    /**
     * Find template groups that have at least one approved translation.
     *
     * Note: Uses separate queries for data and count to avoid TypeORM's
     * getManyAndCount() bug with nullable leftJoinAndSelect relations.
     */
    async findApproved(tenantId, options = {}) {
        const { search, categories, channelAccountId, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', } = options;
        // Build base query conditions (without joins for counting)
        const baseQueryBuilder = () => {
            const qb = this.groupRepository
                .createQueryBuilder('template')
                .where('template.tenant_id = :tenantId', { tenantId })
                .andWhere((subQb) => {
                const subQuery = subQb
                    .subQuery()
                    .select('tt.template_group_id')
                    .from('template_translations', 'tt')
                    .where('tt.status = :approvedStatus', { approvedStatus: enums_1.TemplateStatus.APPROVED })
                    .getQuery();
                return `template.id IN ${subQuery}`;
            });
            // Filter by channel account
            if (channelAccountId) {
                qb.andWhere('template.channel_account_id = :channelAccountId', { channelAccountId });
            }
            // Search by template name
            if (search) {
                qb.andWhere('LOWER(template.name) LIKE LOWER(:search)', {
                    search: `%${search}%`,
                });
            }
            // Filter by categories
            if (categories && categories.length > 0) {
                qb.andWhere('template.category IN (:...categories)', { categories });
            }
            return qb;
        };
        // Get total count first (without joins or ordering)
        const total = await baseQueryBuilder().getCount();
        if (total === 0) {
            return {
                data: [],
                total: 0,
                page,
                limit,
                totalPages: 0,
            };
        }
        // Sorting
        const sortColumn = getSafeSortColumn(sortBy);
        const order = (sortOrder || 'desc').toUpperCase();
        // Pagination - fetch IDs first to avoid TypeORM bug with skip/take on nullable joins
        const skipCount = (page - 1) * limit;
        const idsQuery = baseQueryBuilder()
            .select('template.id')
            .orderBy(`template.${sortColumn}`, order)
            .offset(skipCount)
            .limit(limit);
        const idResults = await idsQuery.getRawMany();
        const ids = idResults.map((r) => r.template_id);
        if (ids.length === 0) {
            return {
                data: [],
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        }
        // Fetch full entities by IDs (no pagination needed, just the specific IDs)
        const data = await this.groupRepository
            .createQueryBuilder('template')
            .leftJoinAndSelect('template.translations', 'translations')
            .leftJoinAndSelect('template.channelAccount', 'channelAccount')
            .where('template.id IN (:...ids)', { ids })
            .orderBy(`template.${sortColumn}`, order)
            .getMany();
        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    /**
     * Create a new template group.
     */
    async create(data) {
        const template = this.groupRepository.create({
            name: data.name,
            category: data.category,
            customFields: data.customFields || {},
            tenantId: data.tenantId,
            channelAccountId: data.channelAccountId || null,
        });
        return this.groupRepository.save(template);
    }
    /**
     * Update a template group.
     */
    async update(id, tenantId, data) {
        const template = await this.findById(tenantId, id);
        if (!template)
            return null;
        Object.assign(template, data);
        return this.groupRepository.save(template);
    }
    /**
     * Delete a template group and all its translations (cascade).
     */
    async delete(id, tenantId) {
        const result = await this.groupRepository.delete({ id, tenantId });
        return (result.affected ?? 0) > 0;
    }
    /**
     * Check if a template with the given name exists for the tenant.
     * When channelAccountId is provided, checks uniqueness within that channel account.
     */
    async existsByName(name, tenantId, excludeId, channelAccountId) {
        const query = this.groupRepository
            .createQueryBuilder('template')
            .where('template.name = :name', { name })
            .andWhere('template.tenant_id = :tenantId', { tenantId });
        // Template names are unique per tenant + channel account
        if (channelAccountId) {
            query.andWhere('template.channel_account_id = :channelAccountId', { channelAccountId });
        }
        else {
            query.andWhere('template.channel_account_id IS NULL');
        }
        if (excludeId) {
            query.andWhere('template.id != :excludeId', { excludeId });
        }
        const count = await query.getCount();
        return count > 0;
    }
    /**
     * Find a translation by its ID.
     */
    async findTranslationById(translationId) {
        return this.translationRepository.findOne({
            where: { id: translationId },
            relations: ['templateGroup'],
        });
    }
    /**
     * Check if a translation exists for the given language in the template group.
     */
    async existsTranslationByLanguage(templateGroupId, language, excludeId) {
        const query = this.translationRepository
            .createQueryBuilder('translation')
            .where('translation.template_group_id = :templateGroupId', { templateGroupId })
            .andWhere('translation.language = :language', { language });
        if (excludeId) {
            query.andWhere('translation.id != :excludeId', { excludeId });
        }
        const count = await query.getCount();
        return count > 0;
    }
    /**
     * Add a translation to a template group.
     */
    async addTranslation(data) {
        const translation = this.translationRepository.create({
            templateGroupId: data.templateGroupId,
            language: data.language,
            headerType: data.headerType,
            headerContent: data.headerContent,
            body: data.body,
            footer: data.footer,
            buttons: data.buttons || [],
            status: enums_1.TemplateStatus.PENDING,
        });
        return this.translationRepository.save(translation);
    }
    /**
     * Update a translation.
     */
    async updateTranslation(translationId, data) {
        const translation = await this.findTranslationById(translationId);
        if (!translation)
            return null;
        Object.assign(translation, data);
        return this.translationRepository.save(translation);
    }
    /**
     * Delete a translation.
     */
    async deleteTranslation(translationId) {
        const result = await this.translationRepository.delete({ id: translationId });
        return (result.affected ?? 0) > 0;
    }
    /**
     * Update template translation status by template name and language.
     *
     * Used for processing template status webhooks from Meta.
     * Finds the template by name within a specific channel account and updates the
     * translation status for the given language.
     *
     * @param tenantId - Tenant ID for multi-tenancy isolation
     * @param channelAccountId - Channel account ID to scope the template lookup
     * @param templateName - Name of the template
     * @param language - Language code of the translation
     * @param newStatus - New status to set
     * @returns Object containing success status, old status if found, and translation ID
     */
    async updateStatusByNameAndLanguage(tenantId, channelAccountId, templateName, language, newStatus) {
        // Find the template group by name within this channel account
        const templateGroup = await this.groupRepository
            .createQueryBuilder('template')
            .leftJoinAndSelect('template.translations', 'translations')
            .where('template.tenant_id = :tenantId', { tenantId })
            .andWhere('template.channel_account_id = :channelAccountId', { channelAccountId })
            .andWhere('template.name = :templateName', { templateName })
            .getOne();
        if (!templateGroup) {
            return { updated: false };
        }
        // Find the translation for the specified language
        const translation = templateGroup.translations?.find((t) => t.language.toLowerCase() === language.toLowerCase());
        if (!translation) {
            return { updated: false };
        }
        const oldStatus = translation.status;
        // Only update if status actually changed
        if (oldStatus === newStatus) {
            return { updated: false, oldStatus, translationId: translation.id };
        }
        // Update the translation status
        await this.translationRepository.update({ id: translation.id }, { status: newStatus });
        return { updated: true, oldStatus, translationId: translation.id };
    }
    /**
     * Find template group by name and channel account.
     *
     * @param tenantId - Tenant ID for multi-tenancy isolation
     * @param channelAccountId - Channel account ID
     * @param templateName - Name of the template
     * @returns Template group with translations or null
     */
    async findByNameAndChannelAccount(tenantId, channelAccountId, templateName) {
        return this.groupRepository.findOne({
            where: {
                tenantId,
                channelAccountId,
                name: templateName,
            },
            relations: ['translations', 'channelAccount'],
        });
    }
};
exports.TemplateRepository = TemplateRepository;
exports.TemplateRepository = TemplateRepository = __decorate([
    (0, tsyringe_1.singleton)()
], TemplateRepository);
