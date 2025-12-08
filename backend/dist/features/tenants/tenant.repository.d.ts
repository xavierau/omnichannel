import { Tenant } from './tenant.entity';
export declare class TenantRepository {
    private _repository;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     */
    private get repository();
    findById(id: string): Promise<Tenant | null>;
    findBySlug(slug: string): Promise<Tenant | null>;
    findAll(): Promise<Tenant[]>;
    create(data: Partial<Tenant>): Promise<Tenant>;
    update(id: string, data: Partial<Tenant>): Promise<Tenant | null>;
    delete(id: string): Promise<boolean>;
    existsBySlug(slug: string, excludeId?: string): Promise<boolean>;
}
