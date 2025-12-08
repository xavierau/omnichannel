import { Tenant } from '../tenants/tenant.entity';
import { User } from '../users/user.entity';
export declare enum MediaType {
    IMAGE = "image",
    VIDEO = "video",
    DOCUMENT = "document"
}
export declare class Media {
    id: string;
    tenantId: string;
    tenant: Tenant;
    type: MediaType;
    originalName: string;
    mimeType: string;
    fileSize: number;
    s3Key: string;
    s3Bucket: string;
    uploadedBy: string;
    uploader: User | null;
    createdAt: Date;
}
