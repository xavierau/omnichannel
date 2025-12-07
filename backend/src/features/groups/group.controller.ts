import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { GroupService } from './group.service';
import { asyncHandler } from '@middleware/async-handler';
import { GroupQueryOptions } from './group.repository';
import {
  toGroupResponse,
  toPaginatedGroupResponse,
  toPaginatedMemberResponse,
} from './group.presenter';

/**
 * Controller for customer group management endpoints.
 * Handles HTTP requests and delegates to GroupService.
 */
@singleton()
export class GroupController {
  constructor(@inject(GroupService) private groupService: GroupService) {}

  /**
   * GET /groups
   * Lists all groups with pagination, search, and filtering.
   */
  listGroups = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;

    const options: GroupQueryOptions = {
      search: req.query.search as string,
      isStatic:
        req.query.isStatic !== undefined
          ? req.query.isStatic === 'true'
          : undefined,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: (req.query.sortBy as string) || 'createdAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const result = await this.groupService.listGroups(tenantId, options);

    res.json(
      toPaginatedGroupResponse(
        result.data,
        result.total,
        result.page,
        result.limit,
        result.totalPages
      )
    );
  });

  /**
   * GET /groups/:id
   * Gets a single group by ID with member count.
   */
  getGroup = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    const group = await this.groupService.getGroup(tenantId, id);

    res.json({
      data: toGroupResponse(group, group.memberCount),
    });
  });

  /**
   * GET /groups/:id/members
   * Gets paginated members of a group.
   */
  getGroupMembers = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await this.groupService.getGroupMembers(
      tenantId,
      id,
      page,
      limit
    );

    res.json(
      toPaginatedMemberResponse(
        result.data,
        result.total,
        result.page,
        result.limit,
        result.totalPages
      )
    );
  });

  /**
   * POST /groups
   * Creates a new customer group.
   */
  createGroup = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;

    const group = await this.groupService.createGroup(req.body, tenantId);

    // Get member count for response
    const memberCount = group.isStatic
      ? group.memberIds?.length ?? 0
      : 0; // Dynamic groups show 0 initially, will be calculated on demand

    res.status(201).json({
      data: toGroupResponse(group, memberCount),
    });
  });

  /**
   * PATCH /groups/:id
   * Updates an existing customer group.
   */
  updateGroup = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    await this.groupService.updateGroup(id, req.body, tenantId);

    // Get updated member count
    const groupWithCount = await this.groupService.getGroup(tenantId, id);

    res.json({
      data: toGroupResponse(groupWithCount, groupWithCount.memberCount),
    });
  });

  /**
   * DELETE /groups/:id
   * Deletes a customer group.
   */
  deleteGroup = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    await this.groupService.deleteGroup(id, tenantId);

    res.status(204).send();
  });
}
