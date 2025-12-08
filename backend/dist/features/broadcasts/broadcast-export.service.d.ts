import { BroadcastRepository, BroadcastQueryOptions } from './broadcast.repository';
import { GroupRepository } from '../groups/group.repository';
/**
 * Data structure for export records.
 * Maps broadcast entity fields to user-friendly export columns.
 */
export interface BroadcastExportRow {
    name: string;
    description: string;
    templateName: string;
    category: string;
    recipientType: string;
    groupName: string;
    totalRecipients: number;
    status: string;
    scheduledAt: string;
    sentCount: number;
    deliveredCount: number;
    readCount: number;
    failedCount: number;
    createdAt: string;
    updatedAt: string;
    completedAt: string;
}
/**
 * Service for exporting broadcast data to CSV and Excel formats.
 * Implements secure export with CSV injection prevention and query limit enforcement.
 */
export declare class BroadcastExportService {
    private broadcastRepository;
    private groupRepository;
    constructor(broadcastRepository: BroadcastRepository, groupRepository: GroupRepository);
    /**
     * Exports broadcasts to CSV string format.
     *
     * @param tenantId - The tenant ID for data isolation
     * @param options - Query options for filtering exports
     * @returns CSV formatted string with headers and data rows
     */
    exportToCsv(tenantId: string, options: BroadcastQueryOptions): Promise<string>;
    /**
     * Exports broadcasts to Excel buffer.
     *
     * @param tenantId - The tenant ID for data isolation
     * @param options - Query options for filtering exports
     * @returns Buffer containing Excel workbook data
     */
    exportToExcel(tenantId: string, options: BroadcastQueryOptions): Promise<Buffer>;
    /**
     * Fetches and transforms broadcast data for export.
     * Resolves group names and formats dates.
     *
     * @param tenantId - The tenant ID for data isolation
     * @param options - Query options for filtering
     * @returns Array of formatted export rows
     */
    getExportData(tenantId: string, options: BroadcastQueryOptions): Promise<BroadcastExportRow[]>;
    /**
     * Fetches group names for the given IDs and returns a lookup map.
     * Uses parallel fetching to minimize query time.
     *
     * @param tenantId - The tenant ID for data isolation
     * @param groupIds - Array of unique group IDs
     * @returns Map of group ID to group name
     */
    private fetchGroupNames;
    /**
     * Transforms a broadcast entity into an export row format.
     *
     * @param broadcast - The broadcast entity
     * @param groupMap - Map of group IDs to names
     * @returns Formatted export row
     */
    private transformToExportRow;
    /**
     * Formats a date to ISO string format for export.
     * Returns empty string for null/undefined values.
     *
     * @param date - Date value to format
     * @returns ISO formatted date string or empty string
     */
    private formatDate;
    /**
     * Escapes a row's string fields to prevent CSV injection attacks.
     * Prefixes dangerous characters with an apostrophe.
     *
     * @param row - Export row to escape
     * @returns Row with escaped string fields
     */
    private escapeRowForCsv;
    /**
     * Escapes a single CSV field value to prevent formula injection.
     * Prefixes values starting with dangerous characters with an apostrophe.
     *
     * @param value - Field value to escape
     * @returns Escaped field value
     */
    private escapeCsvField;
    /**
     * Gets the appropriate column width for Excel export based on field type.
     *
     * @param columnId - Column identifier
     * @returns Column width in characters
     */
    private getColumnWidth;
}
