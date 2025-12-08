import { UserRepository } from './user.repository';
import { User, UserStatus } from './user.entity';
import { PasswordService } from './password.service';
import { PermissionService } from './permission.service';
import { RoleRepository } from '@features/roles/role.repository';
export declare class UserService {
    private userRepo;
    private passwordService;
    private permissionService;
    private roleRepo;
    constructor(userRepo: UserRepository, passwordService: PasswordService, permissionService: PermissionService, roleRepo: RoleRepository);
    /**
     * Create a new user account.
     *
     * Security considerations for timing attack prevention:
     * - Password hashing is performed BEFORE checking email existence
     * - This ensures consistent timing regardless of whether email exists
     * - Generic error messages are used (handled by controller)
     */
    createUser(data: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        status?: UserStatus;
        tenantId?: string;
    }): Promise<User>;
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    updateUser(id: string, data: Partial<User>): Promise<User>;
    updatePassword(userId: string, newPassword: string): Promise<void>;
    validateCredentials(email: string, password: string): Promise<User | null>;
    getUserPermissions(userId: string): Promise<string[]>;
    updateLastLogin(userId: string): Promise<void>;
    listUsers(options?: {
        page?: number;
        limit?: number;
        status?: UserStatus;
    }): Promise<{
        users: User[];
        total: number;
        page: number;
        limit: number;
    }>;
    deleteUser(id: string): Promise<void>;
    /**
     * Add roles to a user
     */
    addRoles(userId: string, roleIds: string[], updatedBy?: string): Promise<User>;
    /**
     * Remove roles from a user
     */
    removeRoles(userId: string, roleIds: string[], updatedBy?: string): Promise<User>;
    /**
     * Sync (replace) all roles for a user
     */
    syncRoles(userId: string, roleIds: string[], updatedBy?: string): Promise<User>;
}
