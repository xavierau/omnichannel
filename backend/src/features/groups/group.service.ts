import { singleton, inject } from 'tsyringe';
import { GroupRepository, GroupQueryOptions, PaginatedResult } from './group.repository';
import { CustomerGroup } from './group.entity';
import { Customer } from '../customers/customer.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '../../shared/exceptions/http-exceptions';
import { auditLogger } from '../../config/logger.config';

/**
 * Service for managing customer groups.
 * Handles business logic for both static and dynamic groups.
 */
@singleton()
export class GroupService {
  constructor(
    @inject(GroupRepository) private groupRepository: GroupRepository
  ) {}

  /**
   * Lists all groups for a tenant with pagination.
   * Includes member count for each group.
   * Uses bulk member count query to prevent N+1 queries.
   */
  async listGroups(
    tenantId: string,
    options: GroupQueryOptions
  ): Promise<PaginatedResult<CustomerGroup & { memberCount: number }>> {
    const result = await this.groupRepository.findAll(tenantId, options);

    // Get all member counts in a single bulk operation (prevents N+1)
    const groupIds = result.data.map(g => g.id);
    const memberCounts = await this.groupRepository.getMemberCountsBulk(tenantId, groupIds);

    // Add member count to each group
    const dataWithCounts = result.data.map(group => ({
      ...group,
      memberCount: memberCounts.get(group.id) ?? 0,
    }));

    return {
      ...result,
      data: dataWithCounts,
    };
  }

  /**
   * Gets a single group by ID with member count.
   */
  async getGroup(
    tenantId: string,
    id: string
  ): Promise<CustomerGroup & { memberCount: number }> {
    const group = await this.groupRepository.findById(tenantId, id);
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const memberCount = await this.groupRepository.getMemberCount(tenantId, id);
    return { ...group, memberCount };
  }

  /**
   * Creates a new customer group.
   *
   * For static groups:
   * - Validates that all provided memberIds exist
   *
   * For dynamic groups:
   * - Stores the criteria for runtime resolution
   */
  async createGroup(dto: CreateGroupDto, tenantId: string): Promise<CustomerGroup> {
    // Check for duplicate name
    const nameExists = await this.groupRepository.existsByName(dto.name, tenantId);
    if (nameExists) {
      throw new ConflictException('A group with this name already exists');
    }

    // Validate memberIds for static groups
    if (dto.isStatic) {
      if (!dto.memberIds || dto.memberIds.length === 0) {
        throw new BadRequestException('memberIds is required for static groups');
      }

      const validCount = await this.groupRepository.validateCustomerIds(
        dto.memberIds,
        tenantId
      );

      if (validCount !== dto.memberIds.length) {
        throw new BadRequestException(
          `Some customer IDs are invalid. Found ${validCount} of ${dto.memberIds.length} customers.`
        );
      }
    }

    // Validate criteria for dynamic groups
    if (!dto.isStatic && !dto.criteria) {
      throw new BadRequestException('criteria is required for dynamic groups');
    }

    const group = await this.groupRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      isStatic: dto.isStatic,
      memberIds: dto.isStatic ? dto.memberIds : null,
      criteria: dto.isStatic ? null : dto.criteria,
      tenantId,
    });

    auditLogger.info('Customer group created', {
      action: 'group.create',
      tenantId,
      groupId: group.id,
      groupName: group.name,
      isStatic: group.isStatic,
      memberCount: dto.isStatic ? dto.memberIds?.length : 'dynamic',
    });

    return group;
  }

  /**
   * Updates an existing customer group.
   *
   * Validates:
   * - Name uniqueness if name is being changed
   * - memberIds validity if updating a static group
   * - Proper criteria/memberIds when changing group type
   */
  async updateGroup(
    id: string,
    dto: UpdateGroupDto,
    tenantId: string
  ): Promise<CustomerGroup> {
    const group = await this.groupRepository.findById(tenantId, id);
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Check for duplicate name if name is being changed
    if (dto.name && dto.name !== group.name) {
      const nameExists = await this.groupRepository.existsByName(
        dto.name,
        tenantId,
        id
      );
      if (nameExists) {
        throw new ConflictException('A group with this name already exists');
      }
    }

    // Determine the effective isStatic value after update
    const effectiveIsStatic = dto.isStatic ?? group.isStatic;

    // If changing to static, validate memberIds
    if (effectiveIsStatic && dto.isStatic !== undefined && dto.isStatic !== group.isStatic) {
      if (!dto.memberIds || dto.memberIds.length === 0) {
        throw new BadRequestException(
          'memberIds is required when changing to a static group'
        );
      }
    }

    // Validate memberIds if provided for a static group
    if (effectiveIsStatic && dto.memberIds) {
      const validCount = await this.groupRepository.validateCustomerIds(
        dto.memberIds,
        tenantId
      );

      if (validCount !== dto.memberIds.length) {
        throw new BadRequestException(
          `Some customer IDs are invalid. Found ${validCount} of ${dto.memberIds.length} customers.`
        );
      }
    }

    // If changing to dynamic, validate criteria
    if (!effectiveIsStatic && dto.isStatic !== undefined && dto.isStatic !== group.isStatic) {
      if (!dto.criteria) {
        throw new BadRequestException(
          'criteria is required when changing to a dynamic group'
        );
      }
    }

    // Build update data
    const updateData: Partial<CustomerGroup> = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }

    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }

    if (dto.isStatic !== undefined) {
      updateData.isStatic = dto.isStatic;

      if (dto.isStatic) {
        updateData.memberIds = dto.memberIds ?? group.memberIds;
        updateData.criteria = null;
      } else {
        updateData.memberIds = null;
        updateData.criteria = dto.criteria ?? group.criteria;
      }
    } else {
      // isStatic not changing - update memberIds or criteria if provided
      if (group.isStatic && dto.memberIds !== undefined) {
        updateData.memberIds = dto.memberIds;
      }

      if (!group.isStatic && dto.criteria !== undefined) {
        updateData.criteria = dto.criteria;
      }
    }

    const updated = await this.groupRepository.update(id, tenantId, updateData);
    if (!updated) {
      throw new NotFoundException('Group not found');
    }

    auditLogger.info('Customer group updated', {
      action: 'group.update',
      tenantId,
      groupId: id,
      changes: Object.keys(dto),
    });

    return updated;
  }

  /**
   * Deletes a customer group.
   */
  async deleteGroup(id: string, tenantId: string): Promise<void> {
    const group = await this.groupRepository.findById(tenantId, id);
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const deleted = await this.groupRepository.delete(id, tenantId);
    if (!deleted) {
      throw new NotFoundException('Group not found');
    }

    auditLogger.info('Customer group deleted', {
      action: 'group.delete',
      tenantId,
      groupId: id,
      groupName: group.name,
    });
  }

  /**
   * Gets paginated members of a group.
   * Works for both static and dynamic groups.
   */
  async getGroupMembers(
    tenantId: string,
    groupId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResult<Customer>> {
    const group = await this.groupRepository.findById(tenantId, groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return this.groupRepository.getMembers(tenantId, groupId, page, limit);
  }

  /**
   * Resolves all customer IDs in a group.
   * Used for broadcasts to get the full list of recipients.
   *
   * For static groups: returns the stored memberIds
   * For dynamic groups: executes criteria query and returns matching customer IDs
   */
  async resolveGroupMemberIds(tenantId: string, groupId: string): Promise<string[]> {
    const group = await this.groupRepository.findById(tenantId, groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return this.groupRepository.getMemberIds(tenantId, groupId);
  }
}
