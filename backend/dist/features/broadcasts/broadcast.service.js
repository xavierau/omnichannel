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
exports.BroadcastService = void 0;
const tsyringe_1 = require("tsyringe");
const broadcast_repository_1 = require("./broadcast.repository");
const template_repository_1 = require("../templates/template.repository");
const group_repository_1 = require("../groups/group.repository");
const customer_repository_1 = require("../customers/customer.repository");
const enums_1 = require("./enums");
const enums_2 = require("../templates/enums");
const http_exceptions_1 = require("../../shared/exceptions/http-exceptions");
const logger_config_1 = require("../../config/logger.config");
const broadcast_report_presenter_1 = require("./broadcast-report.presenter");
const broadcast_queue_1 = require("../../jobs/broadcast.queue");
/**
 * Statuses that allow editing a broadcast.
 */
const EDITABLE_STATUSES = [
    enums_1.BroadcastStatus.DRAFT,
    enums_1.BroadcastStatus.SCHEDULED,
];
/**
 * Statuses that allow deleting a broadcast.
 */
const DELETABLE_STATUSES = [
    enums_1.BroadcastStatus.DRAFT,
    enums_1.BroadcastStatus.COMPLETED,
    enums_1.BroadcastStatus.CANCELLED,
    enums_1.BroadcastStatus.FAILED,
];
/**
 * Statuses that allow pausing a broadcast.
 */
const PAUSABLE_STATUSES = [
    enums_1.BroadcastStatus.SCHEDULED,
    enums_1.BroadcastStatus.SENDING,
];
/**
 * Statuses that allow cancelling a broadcast.
 */
const CANCELLABLE_STATUSES = [
    enums_1.BroadcastStatus.SCHEDULED,
    enums_1.BroadcastStatus.PAUSED,
];
/**
 * Service layer for broadcast operations.
 * Handles business logic, validation, and coordination between repositories.
 */
let BroadcastService = class BroadcastService {
    broadcastRepository;
    templateRepository;
    groupRepository;
    customerRepository;
    broadcastQueue;
    constructor(broadcastRepository, templateRepository, groupRepository, customerRepository, broadcastQueue) {
        this.broadcastRepository = broadcastRepository;
        this.templateRepository = templateRepository;
        this.groupRepository = groupRepository;
        this.customerRepository = customerRepository;
        this.broadcastQueue = broadcastQueue;
    }
    /**
     * List broadcasts with filtering, pagination, and optional ownership filtering.
     *
     * @param tenantId - The tenant ID
     * @param userId - The current user ID (for ownership checks)
     * @param options - Query options
     * @param isAdmin - Whether the user has admin privileges
     * @returns Paginated list of broadcasts
     */
    async listBroadcasts(tenantId, userId, options, isAdmin = true) {
        // If not admin, filter by creator (own scope)
        const queryOptions = {
            ...options,
            ...(isAdmin ? {} : { createdBy: userId }),
        };
        return this.broadcastRepository.findAll(tenantId, queryOptions);
    }
    /**
     * Get a single broadcast by ID.
     *
     * @param tenantId - The tenant ID
     * @param id - The broadcast ID
     * @param userId - The current user ID (for ownership checks)
     * @param isAdmin - Whether the user has admin privileges
     * @returns The broadcast
     * @throws NotFoundException if broadcast not found
     * @throws ForbiddenException if user lacks access
     */
    async getBroadcast(tenantId, id, userId, isAdmin = true) {
        const broadcast = await this.broadcastRepository.findById(tenantId, id);
        if (!broadcast) {
            throw new http_exceptions_1.NotFoundException('Broadcast not found');
        }
        // Check ownership for non-admin users
        if (!isAdmin && userId && broadcast.createdBy !== userId) {
            throw new http_exceptions_1.ForbiddenException('You can only access your own broadcasts');
        }
        return broadcast;
    }
    /**
     * Create a new broadcast.
     * Validates template, recipients, and calculates total recipients.
     *
     * @param dto - The create broadcast DTO
     * @param tenantId - The tenant ID
     * @param userId - The creator user ID
     * @returns The created broadcast
     */
    async createBroadcast(dto, tenantId, userId) {
        // 1. Validate template exists and has approved translation
        const { templateName, templateCategory } = await this.validateTemplate(tenantId, dto.templateId, dto.templateLanguage);
        // 2. Validate and calculate recipients
        const totalRecipients = await this.validateAndCountRecipients(tenantId, dto.recipientType, dto.groupId, dto.customerIds);
        // 3. Create broadcast data
        const broadcastData = {
            tenantId,
            name: dto.name,
            description: dto.description || null,
            templateId: dto.templateId,
            templateName,
            templateCategory,
            templateLanguage: dto.templateLanguage,
            recipientType: dto.recipientType,
            groupId: dto.recipientType === enums_1.RecipientType.GROUP ? dto.groupId : null,
            customerIds: dto.recipientType === enums_1.RecipientType.CUSTOMERS ? dto.customerIds : null,
            totalRecipients,
            templateVariables: this.mapTemplateVariables(dto.templateVariables),
            isImmediate: dto.isImmediate,
            scheduledAt: dto.isImmediate ? null : dto.scheduledAt,
            timezone: dto.isImmediate ? 'UTC' : dto.timezone,
            status: enums_1.BroadcastStatus.DRAFT,
            createdBy: userId,
            customFields: dto.customFields || {},
        };
        const broadcast = await this.broadcastRepository.create(broadcastData);
        logger_config_1.auditLogger.info('Broadcast created', {
            action: 'broadcast.create',
            tenantId,
            userId,
            broadcastId: broadcast.id,
            broadcastName: broadcast.name,
            recipientType: broadcast.recipientType,
            totalRecipients: broadcast.totalRecipients,
        });
        return broadcast;
    }
    /**
     * Update an existing broadcast.
     * Only allowed for DRAFT or SCHEDULED status.
     *
     * @param id - The broadcast ID
     * @param dto - The update broadcast DTO
     * @param tenantId - The tenant ID
     * @param userId - The current user ID
     * @param isAdmin - Whether the user has admin privileges
     * @returns The updated broadcast
     */
    async updateBroadcast(id, dto, tenantId, userId, isAdmin = true) {
        const broadcast = await this.getBroadcast(tenantId, id, userId, isAdmin);
        // Check if broadcast can be edited
        if (!EDITABLE_STATUSES.includes(broadcast.status)) {
            throw new http_exceptions_1.BadRequestException(`Cannot update broadcast with status "${broadcast.status}". ` +
                `Only broadcasts with status ${EDITABLE_STATUSES.join(' or ')} can be updated.`);
        }
        const updateData = {};
        let templateName = broadcast.templateName;
        let templateCategory = broadcast.templateCategory;
        // Handle template change
        const templateId = dto.templateId ?? broadcast.templateId;
        const templateLanguage = dto.templateLanguage ?? broadcast.templateLanguage;
        if (dto.templateId || dto.templateLanguage) {
            const validation = await this.validateTemplate(tenantId, templateId, templateLanguage);
            templateName = validation.templateName;
            templateCategory = validation.templateCategory;
        }
        // Handle recipient change
        let totalRecipients = broadcast.totalRecipients;
        const recipientType = dto.recipientType ?? broadcast.recipientType;
        if (dto.recipientType || dto.groupId || dto.customerIds) {
            const groupId = dto.groupId ?? (recipientType === enums_1.RecipientType.GROUP ? broadcast.groupId : undefined);
            const customerIds = dto.customerIds ?? (recipientType === enums_1.RecipientType.CUSTOMERS ? broadcast.customerIds : undefined);
            totalRecipients = await this.validateAndCountRecipients(tenantId, recipientType, groupId ?? undefined, customerIds ?? undefined);
            if (dto.recipientType !== undefined) {
                updateData.recipientType = dto.recipientType;
            }
            if (dto.groupId !== undefined || dto.recipientType === enums_1.RecipientType.GROUP) {
                updateData.groupId = recipientType === enums_1.RecipientType.GROUP ? (dto.groupId ?? broadcast.groupId) : null;
            }
            if (dto.customerIds !== undefined || dto.recipientType === enums_1.RecipientType.CUSTOMERS) {
                updateData.customerIds = recipientType === enums_1.RecipientType.CUSTOMERS ? (dto.customerIds ?? broadcast.customerIds) : null;
            }
            updateData.totalRecipients = totalRecipients;
        }
        // Map simple fields
        if (dto.name !== undefined)
            updateData.name = dto.name;
        if (dto.description !== undefined)
            updateData.description = dto.description;
        if (dto.templateId !== undefined) {
            updateData.templateId = dto.templateId;
            updateData.templateName = templateName;
            updateData.templateCategory = templateCategory;
        }
        if (dto.templateLanguage !== undefined)
            updateData.templateLanguage = dto.templateLanguage;
        if (dto.templateVariables !== undefined) {
            updateData.templateVariables = this.mapTemplateVariables(dto.templateVariables);
        }
        if (dto.isImmediate !== undefined) {
            updateData.isImmediate = dto.isImmediate;
            if (dto.isImmediate) {
                updateData.scheduledAt = null;
                updateData.timezone = 'UTC';
            }
        }
        if (dto.scheduledAt !== undefined)
            updateData.scheduledAt = dto.scheduledAt;
        if (dto.timezone !== undefined)
            updateData.timezone = dto.timezone;
        if (dto.customFields !== undefined) {
            updateData.customFields = {
                ...broadcast.customFields,
                ...dto.customFields,
            };
        }
        const updated = await this.broadcastRepository.update(id, tenantId, updateData);
        if (!updated) {
            throw new http_exceptions_1.NotFoundException('Broadcast not found');
        }
        logger_config_1.auditLogger.info('Broadcast updated', {
            action: 'broadcast.update',
            tenantId,
            userId,
            broadcastId: id,
            changes: Object.keys(dto),
        });
        return updated;
    }
    /**
     * Delete a broadcast.
     * Only allowed for DRAFT, COMPLETED, CANCELLED, or FAILED status.
     *
     * @param id - The broadcast ID
     * @param tenantId - The tenant ID
     * @param userId - The current user ID
     * @param isAdmin - Whether the user has admin privileges
     */
    async deleteBroadcast(id, tenantId, userId, isAdmin = true) {
        const broadcast = await this.getBroadcast(tenantId, id, userId, isAdmin);
        // Check if broadcast can be deleted
        if (!DELETABLE_STATUSES.includes(broadcast.status)) {
            throw new http_exceptions_1.BadRequestException(`Cannot delete broadcast with status "${broadcast.status}". ` +
                `Only broadcasts with status ${DELETABLE_STATUSES.join(', ')} can be deleted.`);
        }
        const deleted = await this.broadcastRepository.delete(id, tenantId);
        if (!deleted) {
            throw new http_exceptions_1.NotFoundException('Broadcast not found');
        }
        logger_config_1.auditLogger.info('Broadcast deleted', {
            action: 'broadcast.delete',
            tenantId,
            userId,
            broadcastId: id,
            broadcastName: broadcast.name,
        });
    }
    /**
     * Bulk delete broadcasts.
     * Only deletes broadcasts that are in deletable status.
     * Uses pessimistic locking and transactions for atomicity.
     *
     * @param ids - Array of broadcast IDs
     * @param tenantId - The tenant ID
     * @param userId - The current user ID
     * @returns Number of broadcasts deleted
     */
    async bulkDelete(ids, tenantId, userId) {
        const deleted = await this.broadcastRepository.bulkDeleteWithTransaction(ids, tenantId, DELETABLE_STATUSES);
        const skipped = ids.length - deleted;
        logger_config_1.auditLogger.info('Broadcasts bulk deleted', {
            action: 'broadcast.bulk_delete',
            tenantId,
            userId,
            requestedCount: ids.length,
            deletedCount: deleted,
            skippedCount: skipped,
        });
        return { deleted, skipped };
    }
    /**
     * Schedule a draft broadcast for sending at a scheduled time.
     * Uses pessimistic locking to prevent race conditions.
     *
     * @param id - The broadcast ID
     * @param tenantId - The tenant ID
     * @param userId - The current user ID
     * @param isAdmin - Whether the user has admin privileges
     * @returns The updated broadcast
     * @throws BadRequestException if status is not DRAFT or scheduledAt is missing/past
     */
    async schedule(id, tenantId, userId, isAdmin = true) {
        // First check ownership without lock for fast failure
        const broadcast = await this.getBroadcast(tenantId, id, userId, isAdmin);
        if (!broadcast.scheduledAt) {
            throw new http_exceptions_1.BadRequestException('Cannot schedule broadcast without a scheduled time. Set scheduledAt first.');
        }
        if (new Date(broadcast.scheduledAt) <= new Date()) {
            throw new http_exceptions_1.BadRequestException('Scheduled time must be in the future.');
        }
        // Use pessimistic locking for atomic status transition
        const updated = await this.broadcastRepository.updateStatusWithLock(id, tenantId, [enums_1.BroadcastStatus.DRAFT], enums_1.BroadcastStatus.SCHEDULED);
        // Add job to queue with delay
        try {
            await this.broadcastQueue.scheduleBroadcast(id, tenantId, new Date(broadcast.scheduledAt));
        }
        catch (error) {
            // Revert status if queue operation fails
            await this.broadcastRepository.update(id, tenantId, {
                status: enums_1.BroadcastStatus.DRAFT,
            });
            logger_config_1.logger.error('Failed to schedule broadcast in queue', {
                broadcastId: id,
                error: error instanceof Error ? error.message : String(error),
            });
            throw new http_exceptions_1.BadRequestException('Failed to schedule broadcast. Please try again.');
        }
        logger_config_1.auditLogger.info('Broadcast scheduled', {
            action: 'broadcast.schedule',
            tenantId,
            userId,
            broadcastId: id,
            scheduledAt: broadcast.scheduledAt,
        });
        return updated;
    }
    /**
     * Send a draft broadcast immediately.
     * Uses pessimistic locking to prevent race conditions.
     *
     * @param id - The broadcast ID
     * @param tenantId - The tenant ID
     * @param userId - The current user ID
     * @param isAdmin - Whether the user has admin privileges
     * @returns The updated broadcast
     * @throws BadRequestException if status is not DRAFT
     */
    async sendNow(id, tenantId, userId, isAdmin = true) {
        // First check ownership without lock for fast failure
        await this.getBroadcast(tenantId, id, userId, isAdmin);
        // Use pessimistic locking for atomic status transition
        const updated = await this.broadcastRepository.updateStatusWithLock(id, tenantId, [enums_1.BroadcastStatus.DRAFT], enums_1.BroadcastStatus.SENDING, {
            isImmediate: true,
            startedAt: new Date(),
        });
        // Add job to queue for immediate processing
        try {
            await this.broadcastQueue.sendBroadcastNow(id, tenantId);
        }
        catch (error) {
            // Revert status if queue operation fails
            await this.broadcastRepository.update(id, tenantId, {
                status: enums_1.BroadcastStatus.DRAFT,
                isImmediate: false,
                startedAt: null,
            });
            logger_config_1.logger.error('Failed to queue broadcast for immediate sending', {
                broadcastId: id,
                error: error instanceof Error ? error.message : String(error),
            });
            throw new http_exceptions_1.BadRequestException('Failed to send broadcast. Please try again.');
        }
        logger_config_1.auditLogger.info('Broadcast sent immediately', {
            action: 'broadcast.send_now',
            tenantId,
            userId,
            broadcastId: id,
        });
        return updated;
    }
    /**
     * Pause a scheduled or sending broadcast.
     * Uses pessimistic locking to prevent race conditions.
     *
     * @param id - The broadcast ID
     * @param tenantId - The tenant ID
     * @param userId - The current user ID
     * @param isAdmin - Whether the user has admin privileges
     * @returns The updated broadcast
     * @throws BadRequestException if status is not SCHEDULED or SENDING
     */
    async pause(id, tenantId, userId, isAdmin = true) {
        // First check ownership without lock for fast failure
        const broadcast = await this.getBroadcast(tenantId, id, userId, isAdmin);
        // Use pessimistic locking for atomic status transition
        const updated = await this.broadcastRepository.updateStatusWithLock(id, tenantId, PAUSABLE_STATUSES, enums_1.BroadcastStatus.PAUSED, { previousStatus: broadcast.status });
        // Cancel scheduled job if it was scheduled
        if (broadcast.status === enums_1.BroadcastStatus.SCHEDULED) {
            try {
                await this.broadcastQueue.cancelScheduledBroadcast(id);
            }
            catch (error) {
                logger_config_1.logger.warn('Failed to cancel scheduled broadcast job during pause', {
                    broadcastId: id,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        logger_config_1.auditLogger.info('Broadcast paused', {
            action: 'broadcast.pause',
            tenantId,
            userId,
            broadcastId: id,
            previousStatus: broadcast.status,
        });
        return updated;
    }
    /**
     * Resume a paused broadcast.
     * Uses pessimistic locking to prevent race conditions.
     *
     * @param id - The broadcast ID
     * @param tenantId - The tenant ID
     * @param userId - The current user ID
     * @param isAdmin - Whether the user has admin privileges
     * @returns The updated broadcast
     * @throws BadRequestException if status is not PAUSED
     */
    async resume(id, tenantId, userId, isAdmin = true) {
        // First check ownership without lock for fast failure
        const broadcast = await this.getBroadcast(tenantId, id, userId, isAdmin);
        // Restore to previous status (SCHEDULED or SENDING)
        const newStatus = broadcast.previousStatus === enums_1.BroadcastStatus.SCHEDULED
            ? enums_1.BroadcastStatus.SCHEDULED
            : enums_1.BroadcastStatus.SENDING;
        // Use pessimistic locking for atomic status transition
        const updated = await this.broadcastRepository.updateStatusWithLock(id, tenantId, [enums_1.BroadcastStatus.PAUSED], newStatus, { previousStatus: null });
        // Re-schedule job if restoring to SCHEDULED
        if (newStatus === enums_1.BroadcastStatus.SCHEDULED && broadcast.scheduledAt) {
            const scheduledTime = new Date(broadcast.scheduledAt);
            if (scheduledTime > new Date()) {
                try {
                    await this.broadcastQueue.scheduleBroadcast(id, tenantId, scheduledTime);
                }
                catch (error) {
                    // Revert status on failure
                    await this.broadcastRepository.update(id, tenantId, {
                        status: enums_1.BroadcastStatus.PAUSED,
                        previousStatus: broadcast.previousStatus,
                    });
                    logger_config_1.logger.error('Failed to re-schedule broadcast during resume', {
                        broadcastId: id,
                        error: error instanceof Error ? error.message : String(error),
                    });
                    throw new http_exceptions_1.BadRequestException('Failed to resume broadcast. Please try again.');
                }
            }
            else {
                // Scheduled time has passed, send immediately
                try {
                    await this.broadcastQueue.sendBroadcastNow(id, tenantId);
                }
                catch (error) {
                    await this.broadcastRepository.update(id, tenantId, {
                        status: enums_1.BroadcastStatus.PAUSED,
                        previousStatus: broadcast.previousStatus,
                    });
                    logger_config_1.logger.error('Failed to queue broadcast for immediate sending during resume', {
                        broadcastId: id,
                        error: error instanceof Error ? error.message : String(error),
                    });
                    throw new http_exceptions_1.BadRequestException('Failed to resume broadcast. Please try again.');
                }
            }
        }
        else if (newStatus === enums_1.BroadcastStatus.SENDING) {
            // Resume sending
            try {
                await this.broadcastQueue.sendBroadcastNow(id, tenantId);
            }
            catch (error) {
                await this.broadcastRepository.update(id, tenantId, {
                    status: enums_1.BroadcastStatus.PAUSED,
                    previousStatus: broadcast.previousStatus,
                });
                logger_config_1.logger.error('Failed to resume sending broadcast', {
                    broadcastId: id,
                    error: error instanceof Error ? error.message : String(error),
                });
                throw new http_exceptions_1.BadRequestException('Failed to resume broadcast. Please try again.');
            }
        }
        logger_config_1.auditLogger.info('Broadcast resumed', {
            action: 'broadcast.resume',
            tenantId,
            userId,
            broadcastId: id,
            newStatus,
        });
        return updated;
    }
    /**
     * Cancel a scheduled or paused broadcast.
     * Uses pessimistic locking to prevent race conditions.
     *
     * @param id - The broadcast ID
     * @param tenantId - The tenant ID
     * @param userId - The current user ID
     * @param isAdmin - Whether the user has admin privileges
     * @returns The updated broadcast
     * @throws BadRequestException if status is not SCHEDULED or PAUSED
     */
    async cancel(id, tenantId, userId, isAdmin = true) {
        // First check ownership without lock for fast failure
        await this.getBroadcast(tenantId, id, userId, isAdmin);
        // Use pessimistic locking for atomic status transition
        const updated = await this.broadcastRepository.updateStatusWithLock(id, tenantId, CANCELLABLE_STATUSES, enums_1.BroadcastStatus.CANCELLED, { previousStatus: null });
        // Remove any scheduled job
        try {
            await this.broadcastQueue.cancelScheduledBroadcast(id);
        }
        catch (error) {
            logger_config_1.logger.warn('Failed to cancel scheduled broadcast job', {
                broadcastId: id,
                error: error instanceof Error ? error.message : String(error),
            });
        }
        logger_config_1.auditLogger.info('Broadcast cancelled', {
            action: 'broadcast.cancel',
            tenantId,
            userId,
            broadcastId: id,
        });
        return updated;
    }
    /**
     * Retry a failed broadcast.
     * Uses pessimistic locking to prevent race conditions.
     *
     * @param id - The broadcast ID
     * @param tenantId - The tenant ID
     * @param userId - The current user ID
     * @param isAdmin - Whether the user has admin privileges
     * @returns The updated broadcast
     * @throws BadRequestException if status is not FAILED
     */
    async retry(id, tenantId, userId, isAdmin = true) {
        // First check ownership without lock for fast failure
        await this.getBroadcast(tenantId, id, userId, isAdmin);
        // Use pessimistic locking for atomic status transition
        const updated = await this.broadcastRepository.updateStatusWithLock(id, tenantId, [enums_1.BroadcastStatus.FAILED], enums_1.BroadcastStatus.SENDING, {
            sentCount: 0,
            deliveredCount: 0,
            readCount: 0,
            failedCount: 0,
            startedAt: new Date(),
            completedAt: null,
            previousStatus: null,
        });
        // Queue for immediate processing
        try {
            await this.broadcastQueue.sendBroadcastNow(id, tenantId);
        }
        catch (error) {
            // Revert status on failure
            await this.broadcastRepository.update(id, tenantId, {
                status: enums_1.BroadcastStatus.FAILED,
            });
            logger_config_1.logger.error('Failed to queue broadcast for retry', {
                broadcastId: id,
                error: error instanceof Error ? error.message : String(error),
            });
            throw new http_exceptions_1.BadRequestException('Failed to retry broadcast. Please try again.');
        }
        logger_config_1.auditLogger.info('Broadcast retry initiated', {
            action: 'broadcast.retry',
            tenantId,
            userId,
            broadcastId: id,
        });
        return updated;
    }
    /**
     * Bulk pause multiple broadcasts.
     * Only pauses broadcasts that are in SCHEDULED or SENDING status.
     * Uses pessimistic locking and transactions for atomicity.
     *
     * @param ids - Array of broadcast IDs
     * @param tenantId - The tenant ID
     * @param userId - The current user ID
     * @returns Count of paused and skipped broadcasts
     */
    async bulkPause(ids, tenantId, userId) {
        const result = await this.broadcastRepository.bulkPauseWithTransaction(ids, tenantId, PAUSABLE_STATUSES);
        const skipped = ids.length - result.paused;
        // Cancel scheduled jobs for paused broadcasts
        for (const item of result.results) {
            if (item.previousStatus === enums_1.BroadcastStatus.SCHEDULED) {
                try {
                    await this.broadcastQueue.cancelScheduledBroadcast(item.id);
                }
                catch (error) {
                    logger_config_1.logger.warn('Failed to cancel scheduled broadcast job during bulk pause', {
                        broadcastId: item.id,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }
        }
        logger_config_1.auditLogger.info('Broadcasts bulk paused', {
            action: 'broadcast.bulk_pause',
            tenantId,
            userId,
            requestedCount: ids.length,
            pausedCount: result.paused,
            skippedCount: skipped,
        });
        return { paused: result.paused, skipped };
    }
    /**
     * Bulk cancel multiple broadcasts.
     * Only cancels broadcasts that are in SCHEDULED or PAUSED status.
     * Uses pessimistic locking and transactions for atomicity.
     *
     * @param ids - Array of broadcast IDs
     * @param tenantId - The tenant ID
     * @param userId - The current user ID
     * @returns Count of cancelled and skipped broadcasts
     */
    async bulkCancel(ids, tenantId, userId) {
        const cancelled = await this.broadcastRepository.bulkCancelWithTransaction(ids, tenantId, CANCELLABLE_STATUSES);
        const skipped = ids.length - cancelled;
        // Cancel any scheduled jobs
        for (const id of ids) {
            try {
                await this.broadcastQueue.cancelScheduledBroadcast(id);
            }
            catch (error) {
                logger_config_1.logger.warn('Failed to cancel scheduled broadcast job during bulk cancel', {
                    broadcastId: id,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        logger_config_1.auditLogger.info('Broadcasts bulk cancelled', {
            action: 'broadcast.bulk_cancel',
            tenantId,
            userId,
            requestedCount: ids.length,
            cancelledCount: cancelled,
            skippedCount: skipped,
        });
        return { cancelled, skipped };
    }
    /**
     * Get a detailed report for a broadcast with calculated metrics.
     *
     * @param id - The broadcast ID
     * @param tenantId - The tenant ID
     * @param userId - The current user ID (for ownership checks)
     * @param isAdmin - Whether the user has admin privileges
     * @returns The broadcast report with calculated percentages
     */
    async getReport(id, tenantId, userId, isAdmin = true) {
        const broadcast = await this.getBroadcast(tenantId, id, userId, isAdmin);
        return (0, broadcast_report_presenter_1.toBroadcastReportResponse)(broadcast);
    }
    /**
     * Validates that a template exists and has an approved translation for the specified language.
     *
     * @param tenantId - The tenant ID
     * @param templateId - The template ID
     * @param language - The language code
     * @returns Template name and category for denormalization
     */
    async validateTemplate(tenantId, templateId, language) {
        const template = await this.templateRepository.findById(tenantId, templateId);
        if (!template) {
            throw new http_exceptions_1.BadRequestException('Template not found');
        }
        // Check for approved translation in the specified language
        const translation = template.translations?.find((t) => t.language === language && t.status === enums_2.TemplateStatus.APPROVED);
        if (!translation) {
            throw new http_exceptions_1.BadRequestException(`Template does not have an approved translation for language "${language}"`);
        }
        return {
            templateName: template.name,
            templateCategory: template.category,
        };
    }
    /**
     * Validates recipients and calculates total count.
     *
     * @param tenantId - The tenant ID
     * @param recipientType - Type of recipients (GROUP or CUSTOMERS)
     * @param groupId - Group ID if recipient type is GROUP
     * @param customerIds - Customer IDs if recipient type is CUSTOMERS
     * @returns Total number of recipients
     */
    async validateAndCountRecipients(tenantId, recipientType, groupId, customerIds) {
        if (recipientType === enums_1.RecipientType.GROUP) {
            if (!groupId) {
                throw new http_exceptions_1.BadRequestException('Group ID is required when recipient type is "group"');
            }
            const group = await this.groupRepository.findById(tenantId, groupId);
            if (!group) {
                throw new http_exceptions_1.BadRequestException('Group not found');
            }
            const memberCount = await this.groupRepository.getMemberCount(tenantId, groupId);
            if (memberCount === 0) {
                throw new http_exceptions_1.BadRequestException('Group has no members');
            }
            return memberCount;
        }
        if (recipientType === enums_1.RecipientType.CUSTOMERS) {
            if (!customerIds || customerIds.length === 0) {
                throw new http_exceptions_1.BadRequestException('At least one customer ID is required when recipient type is "customers"');
            }
            // Validate that all customer IDs exist
            const validCount = await this.groupRepository.validateCustomerIds(customerIds, tenantId);
            if (validCount !== customerIds.length) {
                const invalidCount = customerIds.length - validCount;
                throw new http_exceptions_1.BadRequestException(`${invalidCount} customer ID(s) not found or do not belong to this tenant`);
            }
            return customerIds.length;
        }
        throw new http_exceptions_1.BadRequestException('Invalid recipient type');
    }
    /**
     * Maps DTO template variables to entity format.
     */
    mapTemplateVariables(dto) {
        return {
            header: dto.header
                ? {
                    type: dto.header.type,
                    textVariable: dto.header.textVariable
                        ? {
                            index: dto.header.textVariable.index,
                            sourceType: dto.header.textVariable.sourceType,
                            staticValue: dto.header.textVariable.staticValue,
                            customerField: dto.header.textVariable.customerField,
                        }
                        : undefined,
                    mediaUrl: dto.header.mediaUrl,
                }
                : undefined,
            bodyVariables: dto.bodyVariables.map((v) => ({
                index: v.index,
                sourceType: v.sourceType,
                staticValue: v.staticValue,
                customerField: v.customerField,
            })),
            buttonVariables: (dto.buttonVariables || []).map((bv) => ({
                buttonIndex: bv.buttonIndex,
                variable: {
                    index: bv.variable.index,
                    sourceType: bv.variable.sourceType,
                    staticValue: bv.variable.staticValue,
                    customerField: bv.variable.customerField,
                },
            })),
        };
    }
};
exports.BroadcastService = BroadcastService;
exports.BroadcastService = BroadcastService = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(broadcast_repository_1.BroadcastRepository)),
    __param(1, (0, tsyringe_1.inject)(template_repository_1.TemplateRepository)),
    __param(2, (0, tsyringe_1.inject)(group_repository_1.GroupRepository)),
    __param(3, (0, tsyringe_1.inject)(customer_repository_1.CustomerRepository)),
    __param(4, (0, tsyringe_1.inject)(broadcast_queue_1.BroadcastQueue)),
    __metadata("design:paramtypes", [broadcast_repository_1.BroadcastRepository,
        template_repository_1.TemplateRepository,
        group_repository_1.GroupRepository,
        customer_repository_1.CustomerRepository,
        broadcast_queue_1.BroadcastQueue])
], BroadcastService);
