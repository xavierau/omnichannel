export declare class CreateRoleDto {
    name: string;
    displayName: string;
    description?: string;
    level: number;
    isSystem?: boolean;
}
export declare class UpdateRoleDto {
    name?: string;
    displayName?: string;
    description?: string;
    level?: number;
}
export declare class RolePermissionsDto {
    permissionIds: string[];
}
export declare class RoleResponseDto {
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
    static fromEntity(role: {
        id: string;
        name: string;
        displayName: string;
        description: string | null;
        level: number;
        isSystem: boolean;
        createdAt: Date;
        updatedAt: Date;
        permissions?: Array<{
            id: string;
            resource: string;
            action: string;
            scope: string;
        }>;
    }, includePermissions?: boolean, userCount?: number): RoleResponseDto;
}
