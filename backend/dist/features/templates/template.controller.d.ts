import { Request, Response } from 'express';
import { TemplateService } from './template.service';
import { TemplateSseService } from './template-sse.service';
export declare class TemplateController {
    private templateService;
    private templateSseService;
    constructor(templateService: TemplateService, templateSseService: TemplateSseService);
    /**
     * List all templates with pagination and filtering.
     * GET /
     */
    listTemplates: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Get approved templates (templates with at least one approved translation).
     * GET /approved
     */
    getApprovedTemplates: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Get a single template by ID.
     * GET /:id
     */
    getTemplate: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Create a new template.
     * POST /
     */
    createTemplate: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Update a template.
     * PATCH /:id
     */
    updateTemplate: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Delete a template.
     * DELETE /:id
     */
    deleteTemplate: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Add a translation to a template.
     * POST /:id/translations
     */
    addTranslation: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Update a translation.
     * PATCH /:id/translations/:translationId
     */
    updateTranslation: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Submit a translation to Meta for approval.
     * POST /:id/translations/:translationId/submit
     */
    submitToMeta: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Delete a translation.
     * DELETE /:id/translations/:translationId
     */
    deleteTranslation: (req: Request, res: Response, next: import("express").NextFunction) => void;
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
    subscribeToEvents: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Helper to parse array query parameters.
     * Handles both single values and arrays.
     */
    private parseArrayParam;
}
