import { Tenant } from '../tenants/tenant.entity';
export declare enum TagColor {
    PURPLE = "purple",
    BLUE = "blue",
    GREEN = "green",
    GRAY = "gray",
    YELLOW = "yellow",
    ORANGE = "orange",
    RED = "red",
    PINK = "pink"
}
export declare class Tag {
    id: string;
    tenantId: string;
    tenant: Tenant;
    name: string;
    color: TagColor;
    createdAt: Date;
    updatedAt: Date;
}
