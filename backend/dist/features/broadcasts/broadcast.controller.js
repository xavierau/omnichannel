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
exports.BroadcastController = void 0;
const tsyringe_1 = require("tsyringe");
const broadcast_service_1 = require("./broadcast.service");
const broadcast_export_service_1 = require("./broadcast-export.service");
const broadcast_sse_service_1 = require("./broadcast-sse.service");
const async_handler_1 = require("../../middleware/async-handler");
const broadcast_presenter_1 = require("./broadcast.presenter");
const enums_1 = require("./enums");
const enums_2 = require("../templates/enums");
/**
 * Controller for broadcast CRUD and action operations.
 * Handles HTTP request/response mapping and delegates to the service layer.
 */
let BroadcastController = class BroadcastController {
    broadcastService;
    exportService;
    sseService;
    constructor(broadcastService, exportService, sseService) {
        this.broadcastService = broadcastService;
        this.exportService = exportService;
        this.sseService = sseService;
    }
    /**
     * GET /broadcasts
     * List broadcasts with filtering, pagination, and sorting.
     */
    listBroadcasts = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const user = req.user;
        const userId = user.id;
        // Determine if user has admin privileges
        // This is a simplified check - in production, you might want to check actual permissions
        const isAdmin = this.hasAllScopePermission(user);
        const options = {
            search: req.query.search,
            statuses: this.parseEnumArrayParam(req.query.statuses, enums_1.BroadcastStatus),
            templateCategories: this.parseEnumArrayParam(req.query.templateCategories, enums_2.TemplateCategory),
            dateFrom: req.query.dateFrom,
            dateTo: req.query.dateTo,
            page: parseInt(req.query.page) || 1,
            limit: Math.min(parseInt(req.query.limit) || 10, 100),
            sortBy: req.query.sortBy || 'createdAt',
            sortOrder: req.query.sortOrder || 'desc',
        };
        const result = await this.broadcastService.listBroadcasts(tenantId, userId, options, isAdmin);
        res.json((0, broadcast_presenter_1.toPaginatedBroadcastResponse)(result.data, result.total, result.page, result.limit, result.totalPages));
    });
    /**
     * GET /broadcasts/:id
     * Get a single broadcast by ID.
     */
    getBroadcast = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const tenantId = req.tenantId;
        const user = req.user;
        const isAdmin = this.hasAllScopePermission(user);
        const broadcast = await this.broadcastService.getBroadcast(tenantId, id, user.id, isAdmin);
        res.json({
            data: (0, broadcast_presenter_1.toBroadcastResponse)(broadcast),
        });
    });
    /**
     * POST /broadcasts
     * Create a new broadcast.
     */
    createBroadcast = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const user = req.user;
        const broadcast = await this.broadcastService.createBroadcast(req.body, tenantId, user.id);
        res.status(201).json({
            data: (0, broadcast_presenter_1.toBroadcastResponse)(broadcast),
        });
    });
    /**
     * PATCH /broadcasts/:id
     * Update an existing broadcast.
     */
    updateBroadcast = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const tenantId = req.tenantId;
        const user = req.user;
        const isAdmin = this.hasAllScopePermission(user);
        const broadcast = await this.broadcastService.updateBroadcast(id, req.body, tenantId, user.id, isAdmin);
        res.json({
            data: (0, broadcast_presenter_1.toBroadcastResponse)(broadcast),
        });
    });
    /**
     * DELETE /broadcasts/:id
     * Delete a broadcast.
     */
    deleteBroadcast = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const tenantId = req.tenantId;
        const user = req.user;
        const isAdmin = this.hasAllScopePermission(user);
        await this.broadcastService.deleteBroadcast(id, tenantId, user.id, isAdmin);
        res.status(204).send();
    });
    /**
     * DELETE /broadcasts/bulk
     * Bulk delete broadcasts.
     */
    bulkDelete = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const user = req.user;
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
    scheduleBroadcast = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const tenantId = req.tenantId;
        const user = req.user;
        const isAdmin = this.hasAllScopePermission(user);
        const broadcast = await this.broadcastService.schedule(id, tenantId, user.id, isAdmin);
        res.json({
            data: (0, broadcast_presenter_1.toBroadcastResponse)(broadcast),
        });
    });
    /**
     * POST /broadcasts/:id/send
     * Send a broadcast immediately.
     */
    sendBroadcast = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const tenantId = req.tenantId;
        const user = req.user;
        const isAdmin = this.hasAllScopePermission(user);
        const broadcast = await this.broadcastService.sendNow(id, tenantId, user.id, isAdmin);
        res.json({
            data: (0, broadcast_presenter_1.toBroadcastResponse)(broadcast),
        });
    });
    /**
     * POST /broadcasts/:id/pause
     * Pause a scheduled or sending broadcast.
     */
    pauseBroadcast = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const tenantId = req.tenantId;
        const user = req.user;
        const isAdmin = this.hasAllScopePermission(user);
        const broadcast = await this.broadcastService.pause(id, tenantId, user.id, isAdmin);
        res.json({
            data: (0, broadcast_presenter_1.toBroadcastResponse)(broadcast),
        });
    });
    /**
     * POST /broadcasts/:id/resume
     * Resume a paused broadcast.
     */
    resumeBroadcast = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const tenantId = req.tenantId;
        const user = req.user;
        const isAdmin = this.hasAllScopePermission(user);
        const broadcast = await this.broadcastService.resume(id, tenantId, user.id, isAdmin);
        res.json({
            data: (0, broadcast_presenter_1.toBroadcastResponse)(broadcast),
        });
    });
    /**
     * POST /broadcasts/:id/cancel
     * Cancel a scheduled or paused broadcast.
     */
    cancelBroadcast = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const tenantId = req.tenantId;
        const user = req.user;
        const isAdmin = this.hasAllScopePermission(user);
        const broadcast = await this.broadcastService.cancel(id, tenantId, user.id, isAdmin);
        res.json({
            data: (0, broadcast_presenter_1.toBroadcastResponse)(broadcast),
        });
    });
    /**
     * POST /broadcasts/:id/retry
     * Retry a failed broadcast.
     */
    retryBroadcast = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const tenantId = req.tenantId;
        const user = req.user;
        const isAdmin = this.hasAllScopePermission(user);
        const broadcast = await this.broadcastService.retry(id, tenantId, user.id, isAdmin);
        res.json({
            data: (0, broadcast_presenter_1.toBroadcastResponse)(broadcast),
        });
    });
    /**
     * GET /broadcasts/:id/report
     * Get broadcast report with detailed metrics.
     */
    getBroadcastReport = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const tenantId = req.tenantId;
        const user = req.user;
        const isAdmin = this.hasAllScopePermission(user);
        const report = await this.broadcastService.getReport(id, tenantId, user.id, isAdmin);
        res.json({
            data: report,
        });
    });
    /**
     * GET /broadcasts/:id/progress/stream
     * Server-Sent Events for real-time broadcast progress.
     */
    streamProgress = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const tenantId = req.tenantId;
        const user = req.user;
        const isAdmin = this.hasAllScopePermission(user);
        // Verify access to the broadcast
        const broadcast = await this.broadcastService.getBroadcast(tenantId, id, user.id, isAdmin);
        // Add SSE client with connection limits
        const connected = this.sseService.addClient(id, user.id, res);
        // If connection was rejected due to limits, response has already been sent
        if (!connected) {
            return;
        }
        // Send initial state
        const initialEvent = {
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
    bulkPause = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const user = req.user;
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
    bulkCancel = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const user = req.user;
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
    exportToCsv = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
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
    exportToExcel = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const options = this.buildExportQueryOptions(req);
        const buffer = await this.exportService.exportToExcel(tenantId, options);
        const filename = this.generateExportFilename('broadcasts', 'xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    });
    /**
     * Builds query options for export from request query parameters.
     * Similar to listBroadcasts but without pagination (export limit applied by service).
     */
    buildExportQueryOptions(req) {
        return {
            search: req.query.search,
            statuses: this.parseEnumArrayParam(req.query.statuses, enums_1.BroadcastStatus),
            templateCategories: this.parseEnumArrayParam(req.query.templateCategories, enums_2.TemplateCategory),
            dateFrom: req.query.dateFrom,
            dateTo: req.query.dateTo,
            sortBy: req.query.sortBy || 'createdAt',
            sortOrder: req.query.sortOrder || 'desc',
        };
    }
    /**
     * Generates a filename for exports with timestamp.
     *
     * @param prefix - Filename prefix (e.g., 'broadcasts')
     * @param extension - File extension without dot (e.g., 'csv', 'xlsx')
     * @returns Filename string
     */
    generateExportFilename(prefix, extension) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        return `${prefix}-export-${timestamp}.${extension}`;
    }
    /**
     * Parse array query parameters that can be comma-separated strings or arrays.
     * Validates values against the provided enum type.
     */
    parseEnumArrayParam(value, enumType) {
        if (!value)
            return undefined;
        const enumValues = Object.values(enumType);
        let values;
        if (typeof value === 'string') {
            values = value.split(',').map((v) => v.trim()).filter(Boolean);
        }
        else if (Array.isArray(value)) {
            values = value.map((v) => String(v).trim()).filter(Boolean);
        }
        else {
            return undefined;
        }
        // Filter to only valid enum values
        const validValues = values.filter((v) => enumValues.includes(v));
        return validValues.length > 0 ? validValues : undefined;
    }
    /**
     * Check if user has "all" scope permission for broadcasts.
     * Users with "all" scope can see all broadcasts, while "own" scope users
     * can only see broadcasts they created.
     */
    hasAllScopePermission(user) {
        // Check if user has any admin-level role
        const adminRoles = ['super_admin', 'admin', 'manager'];
        const userRoleNames = user.roles?.map((r) => r.name.toLowerCase()) || [];
        return adminRoles.some((role) => userRoleNames.includes(role));
    }
};
exports.BroadcastController = BroadcastController;
exports.BroadcastController = BroadcastController = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(broadcast_service_1.BroadcastService)),
    __param(1, (0, tsyringe_1.inject)(broadcast_export_service_1.BroadcastExportService)),
    __param(2, (0, tsyringe_1.inject)(broadcast_sse_service_1.BroadcastSseService)),
    __metadata("design:paramtypes", [broadcast_service_1.BroadcastService,
        broadcast_export_service_1.BroadcastExportService,
        broadcast_sse_service_1.BroadcastSseService])
], BroadcastController);
