import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
  Min,
  Max,
  IsArray,
  IsUUID,
  Matches,
} from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @MinLength(2, { message: 'Role name must be at least 2 characters' })
  @MaxLength(50, { message: 'Role name must not exceed 50 characters' })
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'Role name must start with lowercase letter and contain only lowercase letters, numbers, and underscores',
  })
  name: string;

  @IsString()
  @MinLength(2, { message: 'Display name must be at least 2 characters' })
  @MaxLength(100, { message: 'Display name must not exceed 100 characters' })
  displayName: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;

  @IsInt({ message: 'Level must be an integer' })
  @Min(1, { message: 'Level must be at least 1' })
  @Max(10, { message: 'Level must not exceed 10' })
  level: number;

  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Role name must be at least 2 characters' })
  @MaxLength(50, { message: 'Role name must not exceed 50 characters' })
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'Role name must start with lowercase letter and contain only lowercase letters, numbers, and underscores',
  })
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Display name must be at least 2 characters' })
  @MaxLength(100, { message: 'Display name must not exceed 100 characters' })
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;

  @IsOptional()
  @IsInt({ message: 'Level must be an integer' })
  @Min(1, { message: 'Level must be at least 1' })
  @Max(10, { message: 'Level must not exceed 10' })
  level?: number;
}

export class RolePermissionsDto {
  @IsArray()
  @IsUUID('4', { each: true, message: 'Each permission ID must be a valid UUID' })
  permissionIds: string[];
}

export class RoleResponseDto {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  level: number;
  isSystem: boolean;
  permissions?: {
    id: string;
    resource: string;
    action: string;
    scope: string;
  }[];
  userCount?: number;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(role: any, includePermissions = true, userCount?: number): RoleResponseDto {
    const dto = new RoleResponseDto();
    dto.id = role.id;
    dto.name = role.name;
    dto.displayName = role.displayName;
    dto.description = role.description;
    dto.level = role.level;
    dto.isSystem = role.isSystem;
    dto.createdAt = role.createdAt;
    dto.updatedAt = role.updatedAt;

    if (includePermissions && role.permissions) {
      dto.permissions = role.permissions.map((p: any) => ({
        id: p.id,
        resource: p.resource,
        action: p.action,
        scope: p.scope,
      }));
    }

    if (userCount !== undefined) {
      dto.userCount = userCount;
    }

    return dto;
  }
}
