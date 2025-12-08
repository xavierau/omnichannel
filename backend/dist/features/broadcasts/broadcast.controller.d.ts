import { Request, Response } from 'express';
import { BroadcastService } from './broadcast.service';
import { BroadcastExportService } from './broadcast-export.service';
import { BroadcastSseService } from './broadcast-sse.service';
/**
 * Controller for broadcast CRUD and action operations.
 * Handles HTTP request/response mapping and delegates to the service layer.
 */
export declare class BroadcastController {
    private broadcastService;
    private exportService;
    private sseService;
    constructor(broadcastService: BroadcastService, exportService: BroadcastExportService, sseService: BroadcastSseService);
    /**
     * GET /broadcasts
     * List broadcasts with filtering, pagination, and sorting.
     */
    listBroadcasts: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * GET /broadcasts/:id
     * Get a single broadcast by ID.
     */
    getBroadcast: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * POST /broadcasts
     * Create a new broadcast.
     */
    createBroadcast: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * PATCH /broadcasts/:id
     * Update an existing broadcast.
     */
    updateBroadcast: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * DELETE /broadcasts/:id
     * Delete a broadcast.
     */
    deleteBroadcast: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * DELETE /broadcasts/bulk
     * Bulk delete broadcasts.
     */
    bulkDelete: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * POST /broadcasts/:id/schedule
     * Schedule a draft broadcast.
     */
    scheduleBroadcast: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * POST /broadcasts/:id/send
     * Send a broadcast immediately.
     */
    sendBroadcast: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * POST /broadcasts/:id/pause
     * Pause a scheduled or sending broadcast.
     */
    pauseBroadcast: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * POST /broadcasts/:id/resume
     * Resume a paused broadcast.
     */
    resumeBroadcast: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * POST /broadcasts/:id/cancel
     * Cancel a scheduled or paused broadcast.
     */
    cancelBroadcast: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * POST /broadcasts/:id/retry
     * Retry a failed broadcast.
     */
    retryBroadcast: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * GET /broadcasts/:id/report
     * Get broadcast report with detailed metrics.
     */
    getBroadcastReport: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * GET /broadcasts/:id/progress/stream
     * Server-Sent Events for real-time broadcast progress.
     */
    streamProgress: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * POST /broadcasts/bulk-pause
     * Bulk pause multiple broadcasts.
     */
    bulkPause: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * POST /broadcasts/bulk-cancel
     * Bulk cancel multiple broadcasts.
     */
    bulkCancel: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * GET /broadcasts/export/csv
     * Export broadcasts to CSV format.
     * Supports the same query filters as listBroadcasts.
     */
    exportToCsv: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * GET /broadcasts/export/excel
     * Export broadcasts to Excel format.
     * Supports the same query filters as listBroadcasts.
     */
    exportToExcel: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Builds query options for export from request query parameters.
     * Similar to listBroadcasts but without pagination (export limit applied by service).
     */
    private buildExportQueryOptions;
    /**
     * Generates a filename for exports with timestamp.
     *
     * @param prefix - Filename prefix (e.g., 'broadcasts')
     * @param extension - File extension without dot (e.g., 'csv', 'xlsx')
     * @returns Filename string
     */
    private generateExportFilename;
    /**
     * Parse array query parameters that can be comma-separated strings or arrays.
     * Validates values against the provided enum type.
     */
    private parseEnumArrayParam;
    /**
     * Check if user has "all" scope permission for broadcasts.
     * Users with "all" scope can see all broadcasts, while "own" scope users
     * can only see broadcasts they created.
     */
    private hasAllScopePermission;
}
