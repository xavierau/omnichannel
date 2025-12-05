import { singleton, inject } from 'tsyringe';
import { createObjectCsvStringifier } from 'csv-writer';
import ExcelJS from 'exceljs';
import { BroadcastRepository, BroadcastQueryOptions } from './broadcast.repository';
import { GroupRepository } from '../groups/group.repository';
import { Broadcast } from './broadcast.entity';
import { RecipientType } from './enums';
import { auditLogger } from '../../config/logger.config';

/**
 * Maximum number of records that can be exported at once.
 * This limit prevents memory exhaustion and ensures reasonable response times.
 */
const MAX_EXPORT_LIMIT = 10000;

/**
 * Characters that can be used for CSV formula injection attacks.
 * Fields starting with these characters will be escaped.
 */
const DANGEROUS_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

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
 * Column definitions for CSV and Excel exports.
 */
const EXPORT_COLUMNS = [
  { id: 'name', title: 'Name' },
  { id: 'description', title: 'Description' },
  { id: 'templateName', title: 'Template Name' },
  { id: 'category', title: 'Category' },
  { id: 'recipientType', title: 'Recipient Type' },
  { id: 'groupName', title: 'Group Name' },
  { id: 'totalRecipients', title: 'Total Recipients' },
  { id: 'status', title: 'Status' },
  { id: 'scheduledAt', title: 'Scheduled At' },
  { id: 'sentCount', title: 'Sent Count' },
  { id: 'deliveredCount', title: 'Delivered Count' },
  { id: 'readCount', title: 'Read Count' },
  { id: 'failedCount', title: 'Failed Count' },
  { id: 'createdAt', title: 'Created At' },
  { id: 'updatedAt', title: 'Updated At' },
  { id: 'completedAt', title: 'Completed At' },
];

/**
 * Service for exporting broadcast data to CSV and Excel formats.
 * Implements secure export with CSV injection prevention and query limit enforcement.
 */
@singleton()
export class BroadcastExportService {
  constructor(
    @inject(BroadcastRepository) private broadcastRepository: BroadcastRepository,
    @inject(GroupRepository) private groupRepository: GroupRepository
  ) {}

  /**
   * Exports broadcasts to CSV string format.
   *
   * @param tenantId - The tenant ID for data isolation
   * @param options - Query options for filtering exports
   * @returns CSV formatted string with headers and data rows
   */
  async exportToCsv(tenantId: string, options: BroadcastQueryOptions): Promise<string> {
    const data = await this.getExportData(tenantId, options);

    const csvStringifier = createObjectCsvStringifier({
      header: EXPORT_COLUMNS,
    });

    // Escape fields to prevent CSV injection
    const escapedData = data.map((row) => this.escapeRowForCsv(row));

    const header = csvStringifier.getHeaderString();
    const records = csvStringifier.stringifyRecords(escapedData);

    auditLogger.info('Broadcasts exported to CSV', {
      action: 'broadcast.export.csv',
      tenantId,
      recordCount: data.length,
    });

    return header + records;
  }

  /**
   * Exports broadcasts to Excel buffer.
   *
   * @param tenantId - The tenant ID for data isolation
   * @param options - Query options for filtering exports
   * @returns Buffer containing Excel workbook data
   */
  async exportToExcel(tenantId: string, options: BroadcastQueryOptions): Promise<Buffer> {
    const data = await this.getExportData(tenantId, options);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Omnichannel Platform';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Broadcasts');

    // Add header row with styling
    worksheet.columns = EXPORT_COLUMNS.map((col) => ({
      header: col.title,
      key: col.id,
      width: this.getColumnWidth(col.id),
    }));

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data rows
    data.forEach((row) => {
      worksheet.addRow(row);
    });

    // Auto-filter for all columns
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: data.length + 1, column: EXPORT_COLUMNS.length },
    };

    const buffer = await workbook.xlsx.writeBuffer();

    auditLogger.info('Broadcasts exported to Excel', {
      action: 'broadcast.export.excel',
      tenantId,
      recordCount: data.length,
    });

    return Buffer.from(buffer);
  }

  /**
   * Fetches and transforms broadcast data for export.
   * Resolves group names and formats dates.
   *
   * @param tenantId - The tenant ID for data isolation
   * @param options - Query options for filtering
   * @returns Array of formatted export rows
   */
  async getExportData(
    tenantId: string,
    options: BroadcastQueryOptions
  ): Promise<BroadcastExportRow[]> {
    // Enforce maximum limit to prevent memory issues
    const safeOptions: BroadcastQueryOptions = {
      ...options,
      limit: Math.min(options.limit ?? MAX_EXPORT_LIMIT, MAX_EXPORT_LIMIT),
      page: 1,
    };

    const result = await this.broadcastRepository.findAll(tenantId, safeOptions);
    const broadcasts = result.data;

    // Collect unique group IDs to avoid N+1 queries
    const groupIds = new Set<string>();
    broadcasts.forEach((b) => {
      if (b.recipientType === RecipientType.GROUP && b.groupId) {
        groupIds.add(b.groupId);
      }
    });

    // Fetch all groups in parallel and create a lookup map
    const groupMap = await this.fetchGroupNames(tenantId, Array.from(groupIds));

    return broadcasts.map((broadcast) => this.transformToExportRow(broadcast, groupMap));
  }

  /**
   * Fetches group names for the given IDs and returns a lookup map.
   * Uses parallel fetching to minimize query time.
   *
   * @param tenantId - The tenant ID for data isolation
   * @param groupIds - Array of unique group IDs
   * @returns Map of group ID to group name
   */
  private async fetchGroupNames(
    tenantId: string,
    groupIds: string[]
  ): Promise<Map<string, string>> {
    const groupMap = new Map<string, string>();

    if (groupIds.length === 0) {
      return groupMap;
    }

    const groupPromises = groupIds.map(async (groupId) => {
      const group = await this.groupRepository.findById(tenantId, groupId);
      if (group) {
        groupMap.set(groupId, group.name);
      }
    });

    await Promise.all(groupPromises);

    return groupMap;
  }

  /**
   * Transforms a broadcast entity into an export row format.
   *
   * @param broadcast - The broadcast entity
   * @param groupMap - Map of group IDs to names
   * @returns Formatted export row
   */
  private transformToExportRow(
    broadcast: Broadcast,
    groupMap: Map<string, string>
  ): BroadcastExportRow {
    const groupName =
      broadcast.recipientType === RecipientType.GROUP && broadcast.groupId
        ? groupMap.get(broadcast.groupId) ?? ''
        : '';

    return {
      name: broadcast.name,
      description: broadcast.description ?? '',
      templateName: broadcast.templateName,
      category: broadcast.templateCategory,
      recipientType: broadcast.recipientType,
      groupName,
      totalRecipients: broadcast.totalRecipients,
      status: broadcast.status,
      scheduledAt: this.formatDate(broadcast.scheduledAt),
      sentCount: broadcast.sentCount,
      deliveredCount: broadcast.deliveredCount,
      readCount: broadcast.readCount,
      failedCount: broadcast.failedCount,
      createdAt: this.formatDate(broadcast.createdAt),
      updatedAt: this.formatDate(broadcast.updatedAt),
      completedAt: this.formatDate(broadcast.completedAt),
    };
  }

  /**
   * Formats a date to ISO string format for export.
   * Returns empty string for null/undefined values.
   *
   * @param date - Date value to format
   * @returns ISO formatted date string or empty string
   */
  private formatDate(date: Date | null | undefined): string {
    if (!date) {
      return '';
    }
    return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
  }

  /**
   * Escapes a row's string fields to prevent CSV injection attacks.
   * Prefixes dangerous characters with an apostrophe.
   *
   * @param row - Export row to escape
   * @returns Row with escaped string fields
   */
  private escapeRowForCsv(row: BroadcastExportRow): BroadcastExportRow {
    return {
      ...row,
      name: this.escapeCsvField(row.name),
      description: this.escapeCsvField(row.description),
      templateName: this.escapeCsvField(row.templateName),
      category: this.escapeCsvField(row.category),
      recipientType: this.escapeCsvField(row.recipientType),
      groupName: this.escapeCsvField(row.groupName),
      status: this.escapeCsvField(row.status),
      scheduledAt: this.escapeCsvField(row.scheduledAt),
      createdAt: this.escapeCsvField(row.createdAt),
      updatedAt: this.escapeCsvField(row.updatedAt),
      completedAt: this.escapeCsvField(row.completedAt),
    };
  }

  /**
   * Escapes a single CSV field value to prevent formula injection.
   * Prefixes values starting with dangerous characters with an apostrophe.
   *
   * @param value - Field value to escape
   * @returns Escaped field value
   */
  private escapeCsvField(value: string): string {
    if (!value) {
      return value;
    }

    const firstChar = value.charAt(0);
    if (DANGEROUS_PREFIXES.includes(firstChar)) {
      return `'${value}`;
    }

    return value;
  }

  /**
   * Gets the appropriate column width for Excel export based on field type.
   *
   * @param columnId - Column identifier
   * @returns Column width in characters
   */
  private getColumnWidth(columnId: string): number {
    const widthMap: Record<string, number> = {
      name: 30,
      description: 50,
      templateName: 25,
      category: 15,
      recipientType: 15,
      groupName: 25,
      totalRecipients: 18,
      status: 12,
      scheduledAt: 25,
      sentCount: 12,
      deliveredCount: 15,
      readCount: 12,
      failedCount: 12,
      createdAt: 25,
      updatedAt: 25,
      completedAt: 25,
    };

    return widthMap[columnId] ?? 15;
  }
}
