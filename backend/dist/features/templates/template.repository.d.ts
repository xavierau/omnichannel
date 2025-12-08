import { WhatsAppTemplateGroup } from './template-group.entity';
import { TemplateTranslation, TemplateButton } from './template-translation.entity';
import { TemplateCategory, TemplateStatus } from './enums';
export interface TemplateQueryOptions {
    search?: string;
    categories?: TemplateCategory[];
    statuses?: TemplateStatus[];
    channelAccountId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc' | 'ASC' | 'DESC';
}
export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export interface CreateTemplateGroupData {
    name: string;
    category: TemplateCategory;
    customFields?: Record<string, unknown>;
    tenantId: string;
    channelAccountId?: string | null;
}
export interface CreateTranslationData {
    templateGroupId: string;
    language: string;
    headerType?: string | null;
    headerContent?: string | null;
    body: string;
    footer?: string | null;
    buttons?: TemplateButton[];
}
export declare class TemplateRepository {
    private _groupRepository;
    private _translationRepository;
    /**
     * Lazy initialization of the group repository to ensure AppDataSource is initialized.
     * This prevents errors when the DI container instantiates this class before
     * the database connection is established.
     */
    private get groupRepository();
    /**
     * Lazy initialization of the translation repository to ensure AppDataSource is initialized.
     */
    private get translationRepository();
    /**
     * Find all template groups for a tenant with pagination and filtering.
     *
     * Note: Uses separate queries for data and count to avoid TypeORM's
     * getManyAndCount() bug with nullable leftJoinAndSelect relations
     * that causes "Cannot read properties of undefined (reading 'databaseName')" error.
     */
    findAll(tenantId: string, options?: TemplateQueryOptions): Promise<PaginatedResult<WhatsAppTemplateGroup>>;
    /**
     * Find a single template group by ID with all translations.
     */
    findById(tenantId: string, id: string): Promise<WhatsAppTemplateGroup | null>;
    /**
     * Find template groups that have at least one approved translation.
     *
     * Note: Uses separate queries for data and count to avoid TypeORM's
     * getManyAndCount() bug with nullable leftJoinAndSelect relations.
     */
    findApproved(tenantId: string, options?: TemplateQueryOptions): Promise<PaginatedResult<WhatsAppTemplateGroup>>;
    /**
     * Create a new template group.
     */
    create(data: CreateTemplateGroupData): Promise<WhatsAppTemplateGroup>;
    /**
     * Update a template group.
     */
    update(id: string, tenantId: string, data: Partial<WhatsAppTemplateGroup>): Promise<WhatsAppTemplateGroup | null>;
    /**
     * Delete a template group and all its translations (cascade).
     */
    delete(id: string, tenantId: string): Promise<boolean>;
    /**
     * Check if a template with the given name exists for the tenant.
     * When channelAccountId is provided, checks uniqueness within that channel account.
     */
    existsByName(name: string, tenantId: string, excludeId?: string, channelAccountId?: string | null): Promise<boolean>;
    /**
     * Find a translation by its ID.
     */
    findTranslationById(translationId: string): Promise<TemplateTranslation | null>;
    /**
     * Check if a translation exists for the given language in the template group.
     */
    existsTranslationByLanguage(templateGroupId: string, language: string, excludeId?: string): Promise<boolean>;
    /**
     * Add a translation to a template group.
     */
    addTranslation(data: CreateTranslationData): Promise<TemplateTranslation>;
    /**
     * Update a translation.
     */
    updateTranslation(translationId: string, data: Partial<TemplateTranslation>): Promise<TemplateTranslation | null>;
    /**
     * Delete a translation.
     */
    deleteTranslation(translationId: string): Promise<boolean>;
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
    updateStatusByNameAndLanguage(tenantId: string, channelAccountId: string, templateName: string, language: string, newStatus: TemplateStatus): Promise<{
        updated: boolean;
        oldStatus?: TemplateStatus;
        translationId?: string;
    }>;
    /**
     * Find template group by name and channel account.
     *
     * @param tenantId - Tenant ID for multi-tenancy isolation
     * @param channelAccountId - Channel account ID
     * @param templateName - Name of the template
     * @returns Template group with translations or null
     */
    findByNameAndChannelAccount(tenantId: string, channelAccountId: string, templateName: string): Promise<WhatsAppTemplateGroup | null>;
}
