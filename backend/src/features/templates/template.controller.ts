import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { TemplateService } from './template.service';
import { asyncHandler } from '@middleware/async-handler';
import { TemplateQueryOptions } from './template.repository';
import {
  toTemplateGroupResponse,
  toTemplateTranslationResponse,
  toPaginatedTemplateResponse,
} from './template.presenter';
import { TemplateCategory, TemplateStatus } from './enums';

@singleton()
export class TemplateController {
  constructor(@inject(TemplateService) private templateService: TemplateService) {}

  /**
   * List all templates with pagination and filtering.
   * GET /
   */
  listTemplates = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;

    const options: TemplateQueryOptions = {
      search: req.query.search as string,
      categories: this.parseArrayParam<TemplateCategory>(req.query.categories),
      statuses: this.parseArrayParam<TemplateStatus>(req.query.statuses),
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: (req.query.sortBy as string) || 'createdAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const result = await this.templateService.listTemplates(tenantId, options);

    res.json(
      toPaginatedTemplateResponse(
        result.data,
        result.total,
        result.page,
        result.limit,
        result.totalPages
      )
    );
  });

  /**
   * Get approved templates (templates with at least one approved translation).
   * GET /approved
   */
  getApprovedTemplates = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;

    const options: TemplateQueryOptions = {
      search: req.query.search as string,
      categories: this.parseArrayParam<TemplateCategory>(req.query.categories),
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: (req.query.sortBy as string) || 'createdAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const result = await this.templateService.getApprovedTemplates(tenantId, options);

    res.json(
      toPaginatedTemplateResponse(
        result.data,
        result.total,
        result.page,
        result.limit,
        result.totalPages
      )
    );
  });

  /**
   * Get a single template by ID.
   * GET /:id
   */
  getTemplate = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    const template = await this.templateService.getTemplate(tenantId, id);

    res.json({
      data: toTemplateGroupResponse(template),
    });
  });

  /**
   * Create a new template.
   * POST /
   */
  createTemplate = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;

    const template = await this.templateService.createTemplate(req.body, tenantId);

    res.status(201).json({
      data: toTemplateGroupResponse(template),
    });
  });

  /**
   * Update a template.
   * PATCH /:id
   */
  updateTemplate = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    const template = await this.templateService.updateTemplate(id, req.body, tenantId);

    res.json({
      data: toTemplateGroupResponse(template),
    });
  });

  /**
   * Delete a template.
   * DELETE /:id
   */
  deleteTemplate = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    await this.templateService.deleteTemplate(id, tenantId);

    res.status(204).send();
  });

  /**
   * Add a translation to a template.
   * POST /:id/translations
   */
  addTranslation = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    const translation = await this.templateService.addTranslation(id, req.body, tenantId);

    res.status(201).json({
      data: toTemplateTranslationResponse(translation),
    });
  });

  /**
   * Update a translation.
   * PATCH /:id/translations/:translationId
   */
  updateTranslation = asyncHandler(async (req: Request, res: Response) => {
    const { id, translationId } = req.params;
    const tenantId = req.tenantId!;

    const translation = await this.templateService.updateTranslation(
      id,
      translationId,
      req.body,
      tenantId
    );

    res.json({
      data: toTemplateTranslationResponse(translation),
    });
  });

  /**
   * Delete a translation.
   * DELETE /:id/translations/:translationId
   */
  deleteTranslation = asyncHandler(async (req: Request, res: Response) => {
    const { id, translationId } = req.params;
    const tenantId = req.tenantId!;

    await this.templateService.deleteTranslation(id, translationId, tenantId);

    res.status(204).send();
  });

  /**
   * Helper to parse array query parameters.
   * Handles both single values and arrays.
   */
  private parseArrayParam<T>(param: unknown): T[] | undefined {
    if (!param) return undefined;
    if (Array.isArray(param)) return param as T[];
    return [param as T];
  }
}
