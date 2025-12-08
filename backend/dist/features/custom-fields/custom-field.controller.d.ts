import { Request, Response, NextFunction } from 'express';
import { CustomFieldService } from './custom-field.service';
/**
 * Controller for custom field management.
 *
 * Handles HTTP requests for CRUD operations on custom field definitions.
 */
export declare class CustomFieldController {
    private customFieldService;
    constructor(customFieldService: CustomFieldService);
    /**
     * GET /api/custom-fields
     * List all custom fields for the tenant.
     * Query params: entityType (optional)
     */
    list(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /api/custom-fields/:id
     * Get a specific custom field.
     */
    get(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /api/custom-fields
     * Create a new custom field.
     */
    create(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * PUT /api/custom-fields/:id
     * Update a custom field.
     */
    update(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * DELETE /api/custom-fields/:id
     * Delete a custom field.
     */
    delete(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * PATCH /api/custom-fields/reorder
     * Reorder custom fields for an entity type.
     */
    reorder(req: Request, res: Response, next: NextFunction): Promise<void>;
}
