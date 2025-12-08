import { Tenant } from '../tenants/tenant.entity';
import { Tag } from '../tags/tag.entity';
export declare class Customer {
    id: string;
    tenantId: string;
    tenant: Tenant;
    name: string;
    whatsappNumber: string;
    customFields: Record<string, unknown>;
    tags: Tag[];
    createdAt: Date;
    updatedAt: Date;
}
