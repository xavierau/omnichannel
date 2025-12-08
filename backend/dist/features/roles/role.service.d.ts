import { RoleRepository } from './role.repository';
import { Role } from './role.entity';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
export declare class RoleService {
    private roleRepo;
    constructor(roleRepo: RoleRepository);
    findAll(options?: {
        includePermissions?: boolean;
    }): Promise<Role[]>;
    findById(id: string): Promise<Role>;
    findByName(name: string): Promise<Role | null>;
    create(data: CreateRoleDto, createdBy?: string): Promise<Role>;
    update(id: string, data: UpdateRoleDto, updatedBy?: string): Promise<Role>;
    delete(id: string, deletedBy?: string): Promise<void>;
    addPermissions(roleId: string, permissionIds: string[], updatedBy?: string): Promise<Role>;
    removePermissions(roleId: string, permissionIds: string[], updatedBy?: string): Promise<Role>;
    syncPermissions(roleId: string, permissionIds: string[], updatedBy?: string): Promise<Role>;
    getUserCount(roleId: string): Promise<number>;
    /**
     * Invalidate Redis cache for all users with this role
     */
    private invalidateRoleCache;
}
