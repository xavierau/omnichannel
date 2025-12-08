import { Role } from './role.entity';
export declare class RoleRepository {
    private _repo;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    private get repo();
    findAll(options?: {
        includePermissions?: boolean;
    }): Promise<Role[]>;
    findById(id: string): Promise<Role | null>;
    findByName(name: string): Promise<Role | null>;
    findByLevel(level: number): Promise<Role[]>;
    findByIds(ids: string[]): Promise<Role[]>;
    create(data: {
        name: string;
        displayName: string;
        description?: string | null;
        level: number;
        isSystem?: boolean;
    }): Promise<Role>;
    update(id: string, data: Partial<{
        name: string;
        displayName: string;
        description: string | null;
        level: number;
    }>): Promise<Role>;
    delete(id: string): Promise<void>;
    addPermissions(roleId: string, permissionIds: string[]): Promise<Role>;
    removePermissions(roleId: string, permissionIds: string[]): Promise<Role>;
    syncPermissions(roleId: string, permissionIds: string[]): Promise<Role>;
    countUsersWithRole(roleId: string): Promise<number>;
}
