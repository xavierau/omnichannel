import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { BroadcastService } from './broadcast.service';
import { BroadcastExportService } from './broadcast-export.service';
import { BroadcastSseService, BroadcastProgressEvent } from './broadcast-sse.service';
import { asyncHandler } from '@middleware/async-handler';
import { BroadcastQueryOptions } from './broadcast.repository';
import {
  toBroadcastResponse,
  toPaginatedBroadcastResponse,
} from './broadcast.presenter';
import { User } from '../users/user.entity';
import { BroadcastStatus } from './enums';
import { TemplateCategory } from '../templates/enums';

/**
 * Controller for broadcast CRUD and action operations.
 * Handles HTTP request/response mapping and delegates to the service layer.
 */
@singleton()
export class BroadcastController {
  constructor(
    @inject(BroadcastService) private broadcastService: BroadcastService,
    @inject(BroadcastExportService) private exportService: BroadcastExportService,
    @inject(BroadcastSseService) private sseService: BroadcastSseService
  ) {}

  /**
   * GET /broadcasts
   * List broadcasts with filtering, pagination, and sorting.
   */
  listBroadcasts = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const user = req.user as User;
    const userId = user.id;

    // Determine if user has admin privileges
    // This is a simplified check - in production, you might want to check actual permissions
    const isAdmin = this.hasAllScopePermission(user);

    const options: BroadcastQueryOptions = {
      search: req.query.search as string,
      statuses: this.parseEnumArrayParam(req.query.statuses, BroadcastStatus),
      templateCategories: this.parseEnumArrayParam(req.query.templateCategories, TemplateCategory),
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      page: parseInt(req.query.page as string) || 1,
      limit: Math.min(parseInt(req.query.limit as string) || 10, 100),
      sortBy: (req.query.sortBy as string) || 'createdAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const result = await this.broadcastService.listBroadcasts(
      tenantId,
      userId,
      options,
      isAdmin
    );

    res.json(
      toPaginatedBroadcastResponse(
        result.data,
        result.total,
        result.page,
        result.limit,
        result.totalPages
      )
    );
  });

  /**
   * GET /broadcasts/:id
   * Get a single broadcast by ID.
   */
  getBroadcast = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const user = req.user as User;
    const isAdmin = this.hasAllScopePermission(user);

    const broadcast = await this.broadcastService.getBroadcast(
      tenantId,
      id,
      user.id,
      isAdmin
    );

    res.json({
      data: toBroadcastResponse(broadcast),
    });
  });

  /**
   * POST /broadcasts
   * Create a new broadcast.
   */
  createBroadcast = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const user = req.user as User;

    const broadcast = await this.broadcastService.createBroadcast(
      req.body,
      tenantId,
      user.id
    );

    res.status(201).json({
      data: toBroadcastResponse(broadcast),
    });
  });

  /**
   * PATCH /broadcasts/:id
   * Update an existing broadcast.
   */
  updateBroadcast = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const user = req.user as User;
    const isAdmin = this.hasAllScopePermission(user);

    const broadcast = await this.broadcastService.updateBroadcast(
      id,
      req.body,
      tenantId,
      user.id,
      isAdmin
    );

    res.json({
      data: toBroadcastResponse(broadcast),
    });
  });

  /**
   * DELETE /broadcasts/:id
   * Delete a broadcast.
   */
  deleteBroadcast = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const user = req.user as User;
    const isAdmin = this.hasAllScopePermission(user);

    await this.broadcastService.deleteBroadcast(id, tenantId, user.id, isAdmin);

    res.status(204).send();
  });

  /**
   * DELETE /broadcasts/bulk
   * Bulk delete broadcasts.
   */
  bulkDelete = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const user = req.user as User;
    const { ids } = req.body;

    const result = await this.broadcastService.bulkDelete(ids, tenantId, user.id);

    res.json({
      data: {
        deleted: result.deleted,
        skipped: result.skipped,
      },
    });
  });

  /**
   * POST /broadcasts/:id/schedule
   * Schedule a draft broadcast.
   */
  scheduleBroadcast = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const user = req.user as User;
    const isAdmin = this.hasAllScopePermission(user);

    const broadcast = await this.broadcastService.schedule(
      id,
      tenantId,
      user.id,
      isAdmin
    );

    res.json({
      data: toBroadcastResponse(broadcast),
    });
  });

  /**
   * POST /broadcasts/:id/send
   * Send a broadcast immediately.
   */
  sendBroadcast = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const user = req.user as User;
    const isAdmin = this.hasAllScopePermission(user);

    const broadcast = await this.broadcastService.sendNow(
      id,
      tenantId,
      user.id,
      isAdmin
    );

    res.json({
      data: toBroadcastResponse(broadcast),
    });
  });

  /**
   * POST /broadcasts/:id/pause
   * Pause a scheduled or sending broadcast.
   */
  pauseBroadcast = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const user = req.user as User;
    const isAdmin = this.hasAllScopePermission(user);

    const broadcast = await this.broadcastService.pause(
      id,
      tenantId,
      user.id,
      isAdmin
    );

    res.json({
      data: toBroadcastResponse(broadcast),
    });
  });

  /**
   * POST /broadcasts/:id/resume
   * Resume a paused broadcast.
   */
  resumeBroadcast = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const user = req.user as User;
    const isAdmin = this.hasAllScopePermission(user);

    const broadcast = await this.broadcastService.resume(
      id,
      tenantId,
      user.id,
      isAdmin
    );

    res.json({
      data: toBroadcastResponse(broadcast),
    });
  });

  /**
   * POST /broadcasts/:id/cancel
   * Cancel a scheduled or paused broadcast.
   */
  cancelBroadcast = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const user = req.user as User;
    const isAdmin = this.hasAllScopePermission(user);

    const broadcast = await this.broadcastService.cancel(
      id,
      tenantId,
      user.id,
      isAdmin
    );

    res.json({
      data: toBroadcastResponse(broadcast),
    });
  });

  /**
   * POST /broadcasts/:id/retry
   * Retry a failed broadcast.
   */
  retryBroadcast = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const user = req.user as User;
    const isAdmin = this.hasAllScopePermission(user);

    const broadcast = await this.broadcastService.retry(
      id,
      tenantId,
      user.id,
      isAdmin
    );

    res.json({
      data: toBroadcastResponse(broadcast),
    });
  });

  /**
   * GET /broadcasts/:id/report
   * Get broadcast report with detailed metrics.
   */
  getBroadcastReport = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const user = req.user as User;
    const isAdmin = this.hasAllScopePermission(user);

    const report = await this.broadcastService.getReport(
      id,
      tenantId,
      user.id,
      isAdmin
    );

    res.json({
      data: report,
    });
  });

  /**
   * GET /broadcasts/:id/progress/stream
   * Server-Sent Events for real-time broadcast progress.
   */
  streamProgress = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const user = req.user as User;
    const isAdmin = this.hasAllScopePermission(user);

    // Verify access to the broadcast
    const broadcast = await this.broadcastService.getBroadcast(
      tenantId,
      id,
      user.id,
      isAdmin
    );

    // Add SSE client with connection limits
    const connected = this.sseService.addClient(id, user.id, res);

    // If connection was rejected due to limits, response has already been sent
    if (!connected) {
      return;
    }

    // Send initial state
    const initialEvent: BroadcastProgressEvent = {
      broadcastId: broadcast.id,
      status: broadcast.status,
      sentCount: broadcast.sentCount,
      deliveredCount: broadcast.deliveredCount,
      readCount: broadcast.readCount,
      failedCount: broadcast.failedCount,
      totalRecipients: broadcast.totalRecipients,
      completedAt: broadcast.completedAt || undefined,
    };

    this.sseService.sendInitialState(res, initialEvent);
  });

  /**
   * POST /broadcasts/bulk-pause
   * Bulk pause multiple broadcasts.
   */
  bulkPause = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const user = req.user as User;
    const { ids } = req.body;

    const result = await this.broadcastService.bulkPause(ids, tenantId, user.id);

    res.json({
      data: {
        paused: result.paused,
        skipped: result.skipped,
      },
    });
  });

  /**
   * POST /broadcasts/bulk-cancel
   * Bulk cancel multiple broadcasts.
   */
  bulkCancel = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const user = req.user as User;
    const { ids } = req.body;

    const result = await this.broadcastService.bulkCancel(ids, tenantId, user.id);

    res.json({
      data: {
        cancelled: result.cancelled,
        skipped: result.skipped,
      },
    });
  });

  /**
   * GET /broadcasts/export/csv
   * Export broadcasts to CSV format.
   * Supports the same query filters as listBroadcasts.
   */
  exportToCsv = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;

    const options = this.buildExportQueryOptions(req);
    const csv = await this.exportService.exportToCsv(tenantId, options);

    const filename = this.generateExportFilename('broadcasts', 'csv');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  });

  /**
   * GET /broadcasts/export/excel
   * Export broadcasts to Excel format.
   * Supports the same query filters as listBroadcasts.
   */
  exportToExcel = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;

    const options = this.buildExportQueryOptions(req);
    const buffer = await this.exportService.exportToExcel(tenantId, options);

    const filename = this.generateExportFilename('broadcasts', 'xlsx');

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  });

  /**
   * Builds query options for export from request query parameters.
   * Similar to listBroadcasts but without pagination (export limit applied by service).
   */
  private buildExportQueryOptions(req: Request): BroadcastQueryOptions {
    return {
      search: req.query.search as string,
      statuses: this.parseEnumArrayParam(req.query.statuses, BroadcastStatus),
      templateCategories: this.parseEnumArrayParam(req.query.templateCategories, TemplateCategory),
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      sortBy: (req.query.sortBy as string) || 'createdAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };
  }

  /**
   * Generates a filename for exports with timestamp.
   *
   * @param prefix - Filename prefix (e.g., 'broadcasts')
   * @param extension - File extension without dot (e.g., 'csv', 'xlsx')
   * @returns Filename string
   */
  private generateExportFilename(prefix: string, extension: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `${prefix}-export-${timestamp}.${extension}`;
  }

  /**
   * Parse array query parameters that can be comma-separated strings or arrays.
   * Validates values against the provided enum type.
   */
  private parseEnumArrayParam<T extends Record<string, string>>(
    value: unknown,
    enumType: T
  ): T[keyof T][] | undefined {
    if (!value) return undefined;

    const enumValues = Object.values(enumType) as string[];
    let values: string[];

    if (typeof value === 'string') {
      values = value.split(',').map((v) => v.trim()).filter(Boolean);
    } else if (Array.isArray(value)) {
      values = value.map((v) => String(v).trim()).filter(Boolean);
    } else {
      return undefined;
    }

    // Filter to only valid enum values
    const validValues = values.filter((v) => enumValues.includes(v));

    return validValues.length > 0 ? (validValues as T[keyof T][]) : undefined;
  }

  /**
   * Check if user has "all" scope permission for broadcasts.
   * Users with "all" scope can see all broadcasts, while "own" scope users
   * can only see broadcasts they created.
   */
  private hasAllScopePermission(user: User): boolean {
    // Check if user has any admin-level role
    const adminRoles = ['super_admin', 'admin', 'manager'];
    const userRoleNames = user.roles?.map((r) => r.name.toLowerCase()) || [];

    return adminRoles.some((role) => userRoleNames.includes(role));
  }
}
