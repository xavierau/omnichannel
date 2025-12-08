import { PermissionRepository } from './permission.repository';
import { Permission, PermissionResource, PermissionAction, PermissionScope } from './permission.entity';
import { CreatePermissionDto } from './dto/permission.dto';
export declare class PermissionCrudService {
    private permissionRepo;
    constructor(permissionRepo: PermissionRepository);
    findAll(options?: {
        resource?: PermissionResource;
        action?: PermissionAction;
    }): Promise<Permission[]>;
    findById(id: string): Promise<Permission>;
    findByIds(ids: string[]): Promise<Permission[]>;
    getPermissionsByResource(resource: PermissionResource): Promise<Permission[]>;
    getAllGroupedByResource(): Promise<Map<PermissionResource, Permission[]>>;
    create(data: CreatePermissionDto, createdBy?: string): Promise<Permission>;
    bulkCreate(data: CreatePermissionDto[], createdBy?: string): Promise<Permission[]>;
    delete(id: string, deletedBy?: string): Promise<void>;
    /**
     * Get all available resources
     */
    getAvailableResources(): PermissionResource[];
    /**
     * Get all available actions
     */
    getAvailableActions(): PermissionAction[];
    /**
     * Get all available scopes
     */
    getAvailableScopes(): PermissionScope[];
    /**
     * Get count of all permissions
     */
    count(): Promise<number>;
}
