import { PermissionResource, PermissionAction, PermissionScope } from '../permission.entity';
export declare class CreatePermissionDto {
    resource: PermissionResource;
    action: PermissionAction;
    scope: PermissionScope;
    description?: string;
}
export declare class PermissionResponseDto {
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
    }): PermissionResponseDto;
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
export declare class GroupedPermissionsResponseDto {
    resource: PermissionResource;
    displayName: string;
    permissions: PermissionResponseDto[];
    static fromGroupedMap(grouped: Map<PermissionResource, PermissionEntity[]>): GroupedPermissionsResponseDto[];
}
export {};
