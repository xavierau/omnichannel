import { Tenant } from '../tenants/tenant.entity';
export interface GroupCriteria {
    tagIds?: string[];
    createdAfter?: string;
    createdBefore?: string;
    customFieldConditions?: Array<{
        fieldKey: string;
        operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan';
        value: string | number | boolean;
    }>;
}
export declare class CustomerGroup {
    id: string;
    tenantId: string;
    tenant: Tenant;
    name: string;
    description: string | null;
    isStatic: boolean;
    memberIds: string[] | null;
    criteria: GroupCriteria | null;
    createdAt: Date;
    updatedAt: Date;
}
