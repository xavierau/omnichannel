import { Request, Response, NextFunction } from 'express';
import { singleton, inject } from 'tsyringe';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CustomFieldService } from './custom-field.service';
import { CustomFieldEntityType } from './custom-field.entity';
import {
  CreateCustomFieldDto,
  UpdateCustomFieldDto,
  ReorderCustomFieldsDto,
} from './dto/custom-field.dto';
import { logger } from '../../config/logger.config';

/**
 * Controller for custom field management.
 *
 * Handles HTTP requests for CRUD operations on custom field definitions.
 */
@singleton()
export class CustomFieldController {
  constructor(
    @inject(CustomFieldService)
    private customFieldService: CustomFieldService
  ) {}

  /**
   * GET /api/custom-fields
   * List all custom fields for the tenant.
   * Query params: entityType (optional)
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const entityTypeParam = req.query.entityType as string | undefined;
      let entityType: CustomFieldEntityType | undefined;

      if (entityTypeParam) {
        if (!Object.values(CustomFieldEntityType).includes(entityTypeParam as CustomFieldEntityType)) {
          res.status(400).json({
            error: `Invalid entityType. Must be one of: ${Object.values(CustomFieldEntityType).join(', ')}`,
          });
          return;
        }
        entityType = entityTypeParam as CustomFieldEntityType;
      }

      const fields = await this.customFieldService.getByTenant(
        tenantId,
        entityType
      );

      res.json({ data: fields });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/custom-fields/:id
   * Get a specific custom field.
   */
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const field = await this.customFieldService.getById(id, tenantId);

      if (!field) {
        res.status(404).json({ error: 'Custom field not found' });
        return;
      }

      res.json({ data: field });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/custom-fields
   * Create a new custom field.
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Transform and validate DTO
      const dto = plainToInstance(CreateCustomFieldDto, req.body);
      const errors = await validate(dto);

      if (errors.length > 0) {
        const errorMessages = errors
          .map((e) => Object.values(e.constraints || {}).join(', '))
          .join('; ');
        res.status(400).json({ error: errorMessages });
        return;
      }

      const field = await this.customFieldService.create(tenantId, dto);

      logger.info('Custom field created via API', {
        customFieldId: field.id,
        tenantId,
        entityType: dto.entityType,
        fieldKey: dto.fieldKey,
      });

      res.status(201).json({ data: field });
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes('already exists') ||
          error.message.includes('must start with') ||
          error.message.includes('required for') ||
          error.message.includes('not allowed for') ||
          error.message.includes('must be a')
        ) {
          res.status(400).json({ error: error.message });
          return;
        }
      }
      next(error);
    }
  }

  /**
   * PUT /api/custom-fields/:id
   * Update a custom field.
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Transform and validate DTO
      const dto = plainToInstance(UpdateCustomFieldDto, req.body);
      const errors = await validate(dto);

      if (errors.length > 0) {
        const errorMessages = errors
          .map((e) => Object.values(e.constraints || {}).join(', '))
          .join('; ');
        res.status(400).json({ error: errorMessages });
        return;
      }

      const field = await this.customFieldService.update(id, tenantId, dto);

      if (!field) {
        res.status(404).json({ error: 'Custom field not found' });
        return;
      }

      logger.info('Custom field updated via API', {
        customFieldId: id,
        tenantId,
      });

      res.json({ data: field });
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes('required for') ||
          error.message.includes('not allowed for') ||
          error.message.includes('must be a')
        ) {
          res.status(400).json({ error: error.message });
          return;
        }
      }
      next(error);
    }
  }

  /**
   * DELETE /api/custom-fields/:id
   * Delete a custom field.
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const deleted = await this.customFieldService.delete(id, tenantId);

      if (!deleted) {
        res.status(404).json({ error: 'Custom field not found' });
        return;
      }

      logger.info('Custom field deleted via API', {
        customFieldId: id,
        tenantId,
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/custom-fields/reorder
   * Reorder custom fields for an entity type.
   */
  async reorder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Transform and validate DTO
      const dto = plainToInstance(ReorderCustomFieldsDto, req.body);
      const errors = await validate(dto);

      if (errors.length > 0) {
        const errorMessages = errors
          .map((e) => Object.values(e.constraints || {}).join(', '))
          .join('; ');
        res.status(400).json({ error: errorMessages });
        return;
      }

      const success = await this.customFieldService.reorder(
        tenantId,
        dto.entityType,
        dto.orderedIds
      );

      if (!success) {
        res.status(400).json({
          error: 'Some field IDs are invalid or do not belong to this entity type',
        });
        return;
      }

      logger.info('Custom fields reordered via API', {
        tenantId,
        entityType: dto.entityType,
        fieldCount: dto.orderedIds.length,
      });

      res.json({
        data: {
          success: true,
          message: 'Fields reordered successfully',
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
