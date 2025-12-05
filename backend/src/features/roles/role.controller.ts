import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { RoleService } from './role.service';
import { asyncHandler } from '@middleware/async-handler';
import { RoleResponseDto } from './dto/role.dto';
import { User } from '@features/users/user.entity';

@singleton()
export class RoleController {
  constructor(@inject(RoleService) private roleService: RoleService) {}

  /**
   * GET /api/roles
   * List all roles
   */
  list = asyncHandler(async (req: Request, res: Response) => {
    const includePermissions = req.query.includePermissions === 'true';
    const roles = await this.roleService.findAll({ includePermissions });

    res.json({
      data: roles.map((role) => RoleResponseDto.fromEntity(role, includePermissions)),
    });
  });

  /**
   * GET /api/roles/:id
   * Get role by ID
   */
  getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const role = await this.roleService.findById(id);
    const userCount = await this.roleService.getUserCount(id);

    res.json({
      data: RoleResponseDto.fromEntity(role, true, userCount),
    });
  });

  /**
   * POST /api/roles
   * Create a new role
   */
  create = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as User;
    const role = await this.roleService.create(req.body, user?.id);

    res.status(201).json({
      data: RoleResponseDto.fromEntity(role),
    });
  });

  /**
   * PATCH /api/roles/:id
   * Update a role
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = req.user as User;
    const role = await this.roleService.update(id, req.body, user?.id);

    res.json({
      data: RoleResponseDto.fromEntity(role),
    });
  });

  /**
   * DELETE /api/roles/:id
   * Delete a role
   */
  delete = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = req.user as User;
    await this.roleService.delete(id, user?.id);

    res.status(204).send();
  });

  /**
   * POST /api/roles/:id/permissions
   * Add permissions to a role
   */
  addPermissions = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { permissionIds } = req.body;
    const user = req.user as User;

    const role = await this.roleService.addPermissions(id, permissionIds, user?.id);

    res.json({
      data: RoleResponseDto.fromEntity(role),
    });
  });

  /**
   * DELETE /api/roles/:id/permissions
   * Remove permissions from a role
   */
  removePermissions = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { permissionIds } = req.body;
    const user = req.user as User;

    const role = await this.roleService.removePermissions(id, permissionIds, user?.id);

    res.json({
      data: RoleResponseDto.fromEntity(role),
    });
  });

  /**
   * PUT /api/roles/:id/permissions
   * Sync (replace) all permissions for a role
   */
  syncPermissions = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { permissionIds } = req.body;
    const user = req.user as User;

    const role = await this.roleService.syncPermissions(id, permissionIds, user?.id);

    res.json({
      data: RoleResponseDto.fromEntity(role),
    });
  });
}
