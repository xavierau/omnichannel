import { Permission, PermissionResource, PermissionAction, PermissionScope } from './permission.entity';
export declare class PermissionRepository {
    private _repo;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    private get repo();
    findAll(options?: {
        resource?: PermissionResource;
        action?: PermissionAction;
    }): Promise<Permission[]>;
    findById(id: string): Promise<Permission | null>;
    findByIds(ids: string[]): Promise<Permission[]>;
    findByResourceAction(resource: PermissionResource, action: PermissionAction, scope?: PermissionScope): Promise<Permission | null>;
    findByResourceActionScope(resource: PermissionResource, action: PermissionAction, scope: PermissionScope): Promise<Permission | null>;
    create(data: {
        resource: PermissionResource;
        action: PermissionAction;
        scope: PermissionScope;
        description?: string | null;
    }): Promise<Permission>;
    bulkCreate(data: Array<{
        resource: PermissionResource;
        action: PermissionAction;
        scope: PermissionScope;
        description?: string | null;
    }>): Promise<Permission[]>;
    delete(id: string): Promise<void>;
    getAllGroupedByResource(): Promise<Map<PermissionResource, Permission[]>>;
    count(): Promise<number>;
}
