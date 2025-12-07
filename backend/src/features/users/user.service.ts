import { inject, singleton } from 'tsyringe';
import { UserRepository } from './user.repository';
import { User, UserStatus } from './user.entity';
import { PasswordService } from './password.service';
import { PermissionService } from './permission.service';
import { RoleRepository } from '@features/roles/role.repository';
import { redisClient } from '@config/redis.config';
import { auditLogger } from '@config/logger.config';
import { NotFoundException, BadRequestException } from '@shared/exceptions/http-exceptions';

@singleton()
export class UserService {
  constructor(
    @inject(UserRepository) private userRepo: UserRepository,
    @inject(PasswordService) private passwordService: PasswordService,
    @inject(PermissionService) private permissionService: PermissionService,
    @inject(RoleRepository) private roleRepo: RoleRepository
  ) {}

  /**
   * Create a new user account.
   *
   * Security considerations for timing attack prevention:
   * - Password hashing is performed BEFORE checking email existence
   * - This ensures consistent timing regardless of whether email exists
   * - Generic error messages are used (handled by controller)
   */
  async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    status?: UserStatus;
    tenantId?: string;
  }): Promise<User> {
    // SECURITY: Hash password FIRST, before checking email existence.
    // This ensures the expensive hashing operation occurs regardless of
    // whether the email exists, preventing timing-based enumeration.
    // Password validation (strength check) happens inside hashPassword.
    const passwordHash = await this.passwordService.hashPassword(data.password);

    // Check if user already exists AFTER hashing
    const existingUser = await this.userRepo.findByEmail(data.email);
    if (existingUser) {
      // Generic error - the controller will convert this to a user-friendly message
      throw new Error('Registration failed');
    }

    // Create user
    const user = await this.userRepo.create({
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      status: data.status || UserStatus.ACTIVE,
      emailVerified: false,
      tenantId: data.tenantId || null,
    });

    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findById(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findByEmail(email);
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = await this.userRepo.update(id, data);

    // Invalidate Redis cache when user is updated
    await redisClient.del(`user:${id}`);

    return updatedUser;
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    // Use PasswordService for password hashing (includes strength validation)
    const passwordHash = await this.passwordService.hashPassword(newPassword);
    await this.userRepo.update(userId, { passwordHash });

    // Invalidate Redis cache
    await redisClient.del(`user:${userId}`);
  }

  async validateCredentials(email: string, password: string): Promise<User | null> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      return null;
    }

    // Use PasswordService for password verification
    const isValid = await this.passwordService.verifyPassword(user.passwordHash, password);
    if (!isValid) {
      return null;
    }

    return user;
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    // Use PermissionService instead of entity method
    return this.permissionService.getUserPermissions(userId);
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.userRepo.updateLastLogin(userId);
  }

  async listUsers(options?: {
    page?: number;
    limit?: number;
    status?: UserStatus;
  }): Promise<{ users: User[]; total: number; page: number; limit: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;

    const [users, total] = await this.userRepo.findAll({
      skip,
      take: limit,
      status: options?.status,
    });

    return {
      users,
      total,
      page,
      limit,
    };
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    await this.userRepo.delete(id);

    // Invalidate Redis cache
    await redisClient.del(`user:${id}`);
  }

  /**
   * Add roles to a user
   */
  async addRoles(userId: string, roleIds: string[], updatedBy?: string): Promise<User> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!roleIds || roleIds.length === 0) {
      throw new BadRequestException('At least one role ID is required');
    }

    // Verify all roles exist
    const roles = await this.roleRepo.findByIds(roleIds);
    if (roles.length !== roleIds.length) {
      throw new BadRequestException('One or more role IDs are invalid');
    }

    // Add new roles (avoid duplicates)
    const existingRoleIds = new Set(user.roles.map((r) => r.id));
    for (const role of roles) {
      if (!existingRoleIds.has(role.id)) {
        user.roles.push(role);
      }
    }

    const updatedUser = await this.userRepo.save(user);

    // Invalidate Redis cache
    await redisClient.del(`user:${userId}`);

    auditLogger.info('Roles added to user', {
      userId,
      userEmail: user.email,
      addedRoleIds: roleIds,
      updatedBy,
    });

    return updatedUser;
  }

  /**
   * Remove roles from a user
   */
  async removeRoles(userId: string, roleIds: string[], updatedBy?: string): Promise<User> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!roleIds || roleIds.length === 0) {
      throw new BadRequestException('At least one role ID is required');
    }

    const idsToRemove = new Set(roleIds);
    user.roles = user.roles.filter((r) => !idsToRemove.has(r.id));

    const updatedUser = await this.userRepo.save(user);

    // Invalidate Redis cache
    await redisClient.del(`user:${userId}`);

    auditLogger.info('Roles removed from user', {
      userId,
      userEmail: user.email,
      removedRoleIds: roleIds,
      updatedBy,
    });

    return updatedUser;
  }

  /**
   * Sync (replace) all roles for a user
   */
  async syncRoles(userId: string, roleIds: string[], updatedBy?: string): Promise<User> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!roleIds) {
      throw new BadRequestException('Role IDs array is required');
    }

    if (roleIds.length === 0) {
      user.roles = [];
    } else {
      const roles = await this.roleRepo.findByIds(roleIds);
      if (roles.length !== roleIds.length) {
        throw new BadRequestException('One or more role IDs are invalid');
      }
      user.roles = roles;
    }

    const updatedUser = await this.userRepo.save(user);

    // Invalidate Redis cache
    await redisClient.del(`user:${userId}`);

    auditLogger.info('Roles synced for user', {
      userId,
      userEmail: user.email,
      newRoleIds: roleIds,
      updatedBy,
    });

    return updatedUser;
  }
}
