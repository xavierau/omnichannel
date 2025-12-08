import { BroadcastRepository, BroadcastQueryOptions, PaginatedResult } from './broadcast.repository';
import { TemplateRepository } from '../templates/template.repository';
import { GroupRepository } from '../groups/group.repository';
import { CustomerRepository } from '../customers/customer.repository';
import { Broadcast } from './broadcast.entity';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';
import { UpdateBroadcastDto } from './dto/update-broadcast.dto';
import { BroadcastReportResponse } from './broadcast-report.presenter';
import { BroadcastQueue } from '../../jobs/broadcast.queue';
/**
 * Service layer for broadcast operations.
 * Handles business logic, validation, and coordination between repositories.
 */
export declare class BroadcastService {
    private broadcastRepository;
    private templateRepository;
    private groupRepository;
    private customerRepository;
    private broadcastQueue;
    constructor(broadcastRepository: BroadcastRepository, templateRepository: TemplateRepository, groupRepository: GroupRepository, customerRepository: CustomerRepository, broadcastQueue: BroadcastQueue);
    /**
     * List broadcasts with filtering, pagination, and optional ownership filtering.
     *
     * @param tenantId - The tenant ID
     * @param userId - The current user ID (for ownership checks)
     * @param options - Query options
     * @param isAdmin - Whether the user has admin privileges
     * @returns Paginated list of broadcasts
     */
    listBroadcasts(tenantId: string, userId: string, options: BroadcastQueryOptions, isAdmin?: boolean): Promise<PaginatedResult<Broadcast>>;
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
    getBroadcast(tenantId: string, id: string, userId?: string, isAdmin?: boolean): Promise<Broadcast>;
    /**
     * Create a new broadcast.
     * Validates template, recipients, and calculates total recipients.
     *
     * @param dto - The create broadcast DTO
     * @param tenantId - The tenant ID
     * @param userId - The creator user ID
     * @returns The created broadcast
     */
    createBroadcast(dto: CreateBroadcastDto, tenantId: string, userId: string): Promise<Broadcast>;
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
    updateBroadcast(id: string, dto: UpdateBroadcastDto, tenantId: string, userId: string, isAdmin?: boolean): Promise<Broadcast>;
    /**
     * Delete a broadcast.
     * Only allowed for DRAFT, COMPLETED, CANCELLED, or FAILED status.
     *
     * @param id - The broadcast ID
     * @param tenantId - The tenant ID
     * @param userId - The current user ID
     * @param isAdmin - Whether the user has admin privileges
     */
    deleteBroadcast(id: string, tenantId: string, userId?: string, isAdmin?: boolean): Promise<void>;
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
    bulkDelete(ids: string[], tenantId: string, userId: string): Promise<{
        deleted: number;
        skipped: number;
    }>;
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
    schedule(id: string, tenantId: string, userId: string, isAdmin?: boolean): Promise<Broadcast>;
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
    sendNow(id: string, tenantId: string, userId: string, isAdmin?: boolean): Promise<Broadcast>;
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
    pause(id: string, tenantId: string, userId: string, isAdmin?: boolean): Promise<Broadcast>;
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
    resume(id: string, tenantId: string, userId: string, isAdmin?: boolean): Promise<Broadcast>;
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
    cancel(id: string, tenantId: string, userId: string, isAdmin?: boolean): Promise<Broadcast>;
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
    retry(id: string, tenantId: string, userId: string, isAdmin?: boolean): Promise<Broadcast>;
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
    bulkPause(ids: string[], tenantId: string, userId: string): Promise<{
        paused: number;
        skipped: number;
    }>;
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
    bulkCancel(ids: string[], tenantId: string, userId: string): Promise<{
        cancelled: number;
        skipped: number;
    }>;
    /**
     * Get a detailed report for a broadcast with calculated metrics.
     *
     * @param id - The broadcast ID
     * @param tenantId - The tenant ID
     * @param userId - The current user ID (for ownership checks)
     * @param isAdmin - Whether the user has admin privileges
     * @returns The broadcast report with calculated percentages
     */
    getReport(id: string, tenantId: string, userId?: string, isAdmin?: boolean): Promise<BroadcastReportResponse>;
    /**
     * Validates that a template exists and has an approved translation for the specified language.
     *
     * @param tenantId - The tenant ID
     * @param templateId - The template ID
     * @param language - The language code
     * @returns Template name and category for denormalization
     */
    private validateTemplate;
    /**
     * Validates recipients and calculates total count.
     *
     * @param tenantId - The tenant ID
     * @param recipientType - Type of recipients (GROUP or CUSTOMERS)
     * @param groupId - Group ID if recipient type is GROUP
     * @param customerIds - Customer IDs if recipient type is CUSTOMERS
     * @returns Total number of recipients
     */
    private validateAndCountRecipients;
    /**
     * Maps DTO template variables to entity format.
     */
    private mapTemplateVariables;
}
