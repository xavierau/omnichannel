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
exports.TemplateController = void 0;
const tsyringe_1 = require("tsyringe");
const template_service_1 = require("./template.service");
const template_sse_service_1 = require("./template-sse.service");
const async_handler_1 = require("@middleware/async-handler");
const template_presenter_1 = require("./template.presenter");
let TemplateController = class TemplateController {
    templateService;
    templateSseService;
    constructor(templateService, templateSseService) {
        this.templateService = templateService;
        this.templateSseService = templateSseService;
    }
    /**
     * List all templates with pagination and filtering.
     * GET /
     */
    listTemplates = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const options = {
            search: req.query.search,
            categories: this.parseArrayParam(req.query.categories),
            statuses: this.parseArrayParam(req.query.statuses),
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            sortBy: req.query.sortBy || 'createdAt',
            sortOrder: req.query.sortOrder || 'desc',
        };
        const result = await this.templateService.listTemplates(tenantId, options);
        res.json((0, template_presenter_1.toPaginatedTemplateResponse)(result.data, result.total, result.page, result.limit, result.totalPages));
    });
    /**
     * Get approved templates (templates with at least one approved translation).
     * GET /approved
     */
    getApprovedTemplates = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const options = {
            search: req.query.search,
            categories: this.parseArrayParam(req.query.categories),
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            sortBy: req.query.sortBy || 'createdAt',
            sortOrder: req.query.sortOrder || 'desc',
        };
        const result = await this.templateService.getApprovedTemplates(tenantId, options);
        res.json((0, template_presenter_1.toPaginatedTemplateResponse)(result.data, result.total, result.page, result.limit, result.totalPages));
    });
    /**
     * Get a single template by ID.
     * GET /:id
     */
    getTemplate = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const tenantId = req.tenantId;
        const template = await this.templateService.getTemplate(tenantId, id);
        res.json({
            data: (0, template_presenter_1.toTemplateGroupResponse)(template),
        });
    });
    /**
     * Create a new template.
     * POST /
     */
    createTemplate = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const template = await this.templateService.createTemplate(req.body, tenantId);
        res.status(201).json({
            data: (0, template_presenter_1.toTemplateGroupResponse)(template),
        });
    });
    /**
     * Update a template.
     * PATCH /:id
     */
    updateTemplate = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const tenantId = req.tenantId;
        const template = await this.templateService.updateTemplate(id, req.body, tenantId);
        res.json({
            data: (0, template_presenter_1.toTemplateGroupResponse)(template),
        });
    });
    /**
     * Delete a template.
     * DELETE /:id
     */
    deleteTemplate = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const tenantId = req.tenantId;
        await this.templateService.deleteTemplate(id, tenantId);
        res.status(204).send();
    });
    /**
     * Add a translation to a template.
     * POST /:id/translations
     */
    addTranslation = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const tenantId = req.tenantId;
        const translation = await this.templateService.addTranslation(id, req.body, tenantId);
        res.status(201).json({
            data: (0, template_presenter_1.toTemplateTranslationResponse)(translation),
        });
    });
    /**
     * Update a translation.
     * PATCH /:id/translations/:translationId
     */
    updateTranslation = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id, translationId } = req.params;
        const tenantId = req.tenantId;
        const translation = await this.templateService.updateTranslation(id, translationId, req.body, tenantId);
        res.json({
            data: (0, template_presenter_1.toTemplateTranslationResponse)(translation),
        });
    });
    /**
     * Delete a translation.
     * DELETE /:id/translations/:translationId
     */
    deleteTranslation = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { id, translationId } = req.params;
        const tenantId = req.tenantId;
        await this.templateService.deleteTranslation(id, translationId, tenantId);
        res.status(204).send();
    });
    /**
     * SSE endpoint for real-time template status updates.
     * GET /events
     *
     * Clients connect to receive real-time notifications about:
     * - Template status changes (approved, rejected, disabled, etc.)
     * - Template sync completion events
     *
     * @remarks
     * This endpoint keeps the connection open for Server-Sent Events.
     * The connection will automatically send heartbeats to stay alive.
     */
    subscribeToEvents = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const userId = req.user.id;
        const connected = this.templateSseService.addClient(tenantId, userId, res);
        if (!connected) {
            // Response already sent by addClient with error
            return;
        }
        // Request is kept open for SSE - no explicit response needed
        // The connection is managed by TemplateSseService
    });
    /**
     * Helper to parse array query parameters.
     * Handles both single values and arrays.
     */
    parseArrayParam(param) {
        if (!param)
            return undefined;
        if (Array.isArray(param))
            return param;
        return [param];
    }
};
exports.TemplateController = TemplateController;
exports.TemplateController = TemplateController = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(template_service_1.TemplateService)),
    __param(1, (0, tsyringe_1.inject)(template_sse_service_1.TemplateSseService)),
    __metadata("design:paramtypes", [template_service_1.TemplateService,
        template_sse_service_1.TemplateSseService])
], TemplateController);
