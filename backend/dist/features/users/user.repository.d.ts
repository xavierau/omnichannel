import { User } from './user.entity';
export declare class UserRepository {
    private _repository;
    /**
     * Lazy initialization of the repository to ensure AppDataSource is initialized.
     * This prevents errors when the DI container instantiates this class before
     * the database connection is established.
     */
    private get repository();
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    create(userData: Partial<User>): Promise<User>;
    update(id: string, userData: Partial<User>): Promise<User>;
    delete(id: string): Promise<void>;
    findAll(options?: {
        skip?: number;
        take?: number;
        status?: string;
    }): Promise<[User[], number]>;
    updateLastLogin(id: string): Promise<void>;
    save(user: User): Promise<User>;
    /**
     * Find users by tenant ID who can be assigned inbox conversations.
     * Includes users who belong to active teams within the tenant.
     *
     * @param tenantId - The tenant ID for isolation
     * @returns Array of users with inbox access
     */
    findOperatorsByTenant(tenantId: string): Promise<User[]>;
}
