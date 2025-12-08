import { Tag } from './tag.entity';
export declare class TagRepository {
    private _repository;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    private get repository();
    findById(id: string, tenantId: string): Promise<Tag | null>;
    findByIds(ids: string[], tenantId: string): Promise<Tag[]>;
    findByTenantId(tenantId: string): Promise<Tag[]>;
    findByName(name: string, tenantId: string): Promise<Tag | null>;
    create(data: Partial<Tag>): Promise<Tag>;
    update(id: string, tenantId: string, data: Partial<Tag>): Promise<Tag | null>;
    delete(id: string, tenantId: string): Promise<boolean>;
    existsByName(name: string, tenantId: string, excludeId?: string): Promise<boolean>;
}
