import { User } from '../users/user.entity';
import { Permission } from '../permissions/permission.entity';
export declare class Role {
    id: string;
    name: string;
    displayName: string;
    description: string | null;
    level: number;
    isSystem: boolean;
    users: User[];
    permissions: Permission[];
    createdAt: Date;
    updatedAt: Date;
}
