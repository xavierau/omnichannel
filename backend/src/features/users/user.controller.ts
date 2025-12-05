import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { UserService } from './user.service';
import { asyncHandler } from '@middleware/async-handler';
import { User } from './user.entity';

@singleton()
export class UserController {
  constructor(@inject(UserService) private userService: UserService) {}

  getMe = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const permissions = await this.userService.getUserPermissions(user.id);

    res.json({
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        emailVerified: user.emailVerified,
        roles: user.roles.map((r) => ({
          id: r.id,
          name: r.name,
          displayName: r.displayName,
        })),
        permissions,
      },
    });
  });

  listUsers = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;

    const result = await this.userService.listUsers({
      page,
      limit,
      status: status as any,
    });

    res.json({
      data: result.users.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        status: u.status,
        emailVerified: u.emailVerified,
        roles: u.roles.map((r) => r.name),
        createdAt: u.createdAt,
      })),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  });

  getUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await this.userService.findById(id);

    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: 'User not found',
      });
    }

    const permissions = await this.userService.getUserPermissions(user.id);

    res.json({
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        emailVerified: user.emailVerified,
        roles: user.roles.map((r) => ({
          id: r.id,
          name: r.name,
          displayName: r.displayName,
        })),
        permissions,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  });

  updateUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { firstName, lastName, status } = req.body;

    const user = await this.userService.updateUser(id, {
      firstName,
      lastName,
      status,
    });

    res.json({
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        emailVerified: user.emailVerified,
      },
    });
  });

  deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.userService.deleteUser(id);

    res.status(204).send();
  });

  /**
   * GET /api/users/:id/roles
   * Get roles assigned to a user
   */
  getUserRoles = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await this.userService.findById(id);

    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: 'User not found',
      });
    }

    res.json({
      data: user.roles.map((r) => ({
        id: r.id,
        name: r.name,
        displayName: r.displayName,
        level: r.level,
      })),
    });
  });

  /**
   * POST /api/users/:id/roles
   * Add roles to a user
   */
  addUserRoles = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { roleIds } = req.body;
    const currentUser = req.user as User;

    const user = await this.userService.addRoles(id, roleIds, currentUser?.id);

    res.json({
      data: {
        id: user.id,
        email: user.email,
        roles: user.roles.map((r) => ({
          id: r.id,
          name: r.name,
          displayName: r.displayName,
        })),
      },
    });
  });

  /**
   * DELETE /api/users/:id/roles
   * Remove roles from a user
   */
  removeUserRoles = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { roleIds } = req.body;
    const currentUser = req.user as User;

    const user = await this.userService.removeRoles(id, roleIds, currentUser?.id);

    res.json({
      data: {
        id: user.id,
        email: user.email,
        roles: user.roles.map((r) => ({
          id: r.id,
          name: r.name,
          displayName: r.displayName,
        })),
      },
    });
  });

  /**
   * PUT /api/users/:id/roles
   * Sync (replace) all roles for a user
   */
  syncUserRoles = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { roleIds } = req.body;
    const currentUser = req.user as User;

    const user = await this.userService.syncRoles(id, roleIds, currentUser?.id);

    res.json({
      data: {
        id: user.id,
        email: user.email,
        roles: user.roles.map((r) => ({
          id: r.id,
          name: r.name,
          displayName: r.displayName,
        })),
      },
    });
  });
}
