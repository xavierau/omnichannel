import { TenantRepository } from './tenant.repository';
import { Tenant } from './tenant.entity';
interface CreateTenantDto {
    name: string;
    slug: string;
}
interface UpdateTenantDto {
    name?: string;
    slug?: string;
    isActive?: boolean;
}
export declare class TenantService {
    private tenantRepository;
    constructor(tenantRepository: TenantRepository);
    findAll(): Promise<Tenant[]>;
    findById(id: string): Promise<Tenant>;
    findBySlug(slug: string): Promise<Tenant>;
    create(dto: CreateTenantDto): Promise<Tenant>;
    update(id: string, dto: UpdateTenantDto): Promise<Tenant>;
    delete(id: string): Promise<void>;
}
export {};
