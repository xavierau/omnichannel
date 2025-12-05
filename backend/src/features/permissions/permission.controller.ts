import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { PermissionCrudService } from './permission.service';
import { asyncHandler } from '@middleware/async-handler';
import {
  PermissionResponseDto,
  GroupedPermissionsResponseDto,
} from './dto/permission.dto';
import { PermissionResource, PermissionAction } from './permission.entity';

@singleton()
export class PermissionController {
  constructor(
    @inject(PermissionCrudService) private permissionService: PermissionCrudService
  ) {}

  /**
   * GET /api/permissions
   * List all permissions with optional filtering
   */
  list = asyncHandler(async (req: Request, res: Response) => {
    const resource = req.query.resource as PermissionResource | undefined;
    const action = req.query.action as PermissionAction | undefined;

    const permissions = await this.permissionService.findAll({ resource, action });

    res.json({
      data: permissions.map((p) => PermissionResponseDto.fromEntity(p)),
    });
  });

  /**
   * GET /api/permissions/grouped
   * Get all permissions grouped by resource
   */
  getGrouped = asyncHandler(async (req: Request, res: Response) => {
    const grouped = await this.permissionService.getAllGroupedByResource();

    res.json({
      data: GroupedPermissionsResponseDto.fromGroupedMap(grouped),
    });
  });

  /**
   * GET /api/permissions/meta
   * Get permission metadata (available resources, actions, scopes)
   */
  getMeta = asyncHandler(async (req: Request, res: Response) => {
    const count = await this.permissionService.count();

    res.json({
      data: {
        resources: this.permissionService.getAvailableResources(),
        actions: this.permissionService.getAvailableActions(),
        scopes: this.permissionService.getAvailableScopes(),
        totalCount: count,
      },
    });
  });

  /**
   * GET /api/permissions/:id
   * Get permission by ID
   */
  getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const permission = await this.permissionService.findById(id);

    res.json({
      data: PermissionResponseDto.fromEntity(permission),
    });
  });
}
