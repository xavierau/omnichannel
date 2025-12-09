import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  PermissionResource,
  PermissionAction,
  PermissionScope,
} from '../permission.entity';

export class CreatePermissionDto {
  @IsEnum(PermissionResource, {
    message: `Resource must be one of: ${Object.values(PermissionResource).join(', ')}`,
  })
  resource: PermissionResource;

  @IsEnum(PermissionAction, {
    message: `Action must be one of: ${Object.values(PermissionAction).join(', ')}`,
  })
  action: PermissionAction;

  @IsEnum(PermissionScope, {
    message: `Scope must be one of: ${Object.values(PermissionScope).join(', ')}`,
  })
  scope: PermissionScope;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;
}

export class PermissionResponseDto {
  id: string;
  resource: PermissionResource;
  action: PermissionAction;
  scope: PermissionScope;
  description: string | null;
  permissionString: string;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(permission: {
    id: string;
    resource: PermissionResource;
    action: PermissionAction;
    scope: PermissionScope;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): PermissionResponseDto {
    const dto = new PermissionResponseDto();
    dto.id = permission.id;
    dto.resource = permission.resource;
    dto.action = permission.action;
    dto.scope = permission.scope;
    dto.description = permission.description;
    dto.permissionString = `${permission.resource}:${permission.action}:${permission.scope}`;
    dto.createdAt = permission.createdAt;
    dto.updatedAt = permission.updatedAt;
    return dto;
  }
}

interface PermissionEntity {
  id: string;
  resource: PermissionResource;
  action: PermissionAction;
  scope: PermissionScope;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class GroupedPermissionsResponseDto {
  resource: PermissionResource;
  displayName: string;
  permissions: PermissionResponseDto[];

  static fromGroupedMap(
    grouped: Map<PermissionResource, PermissionEntity[]>
  ): GroupedPermissionsResponseDto[] {
    const resourceDisplayNames: Record<PermissionResource, string> = {
      [PermissionResource.BROADCASTS]: 'Broadcasts',
      [PermissionResource.CUSTOMERS]: 'Customers',
      [PermissionResource.TEMPLATES]: 'Templates',
      [PermissionResource.CONVERSATIONS]: 'Conversations',
      [PermissionResource.USERS]: 'Users',
      [PermissionResource.SETTINGS]: 'Settings',
      [PermissionResource.API_KEYS]: 'API Keys',
      [PermissionResource.CHANNELS]: 'Channels',
      [PermissionResource.CUSTOM_FIELDS]: 'Custom Fields',
      [PermissionResource.NOTES]: 'Notes',
      [PermissionResource.TEAMS]: 'Teams',
      [PermissionResource.INBOX]: 'Inbox',
      [PermissionResource.INVITATIONS]: 'Invitations',
    };

    const result: GroupedPermissionsResponseDto[] = [];

    for (const [resource, permissions] of grouped) {
      const dto = new GroupedPermissionsResponseDto();
      dto.resource = resource;
      dto.displayName = resourceDisplayNames[resource] || resource;
      dto.permissions = permissions.map((p) => PermissionResponseDto.fromEntity(p));
      result.push(dto);
    }

    // Sort by display name
    result.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return result;
  }
}
