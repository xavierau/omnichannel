import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Tenant } from '../../tenants/tenant.entity';
import { ChannelAccount } from '../../channel-accounts/channel-account.entity';
import { User } from '../../users/user.entity';
import { ApiKeyPermission } from '../enums/api-key-permission.enum';

/**
 * ApiKey entity represents an API key for AI agents to interact with the messaging platform.
 * Each key is scoped to a tenant and optionally to a specific channel account.
 * Keys are stored as SHA-256 hashes for security.
 */
@Entity('api_keys')
@Unique(['tenantId', 'keyHash'])
@Index(['tenantId', 'channelAccountId'])
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'channel_account_id', nullable: true })
  channelAccountId: string | null;

  @ManyToOne(() => ChannelAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_account_id' })
  channelAccount: ChannelAccount | null;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'key_hash', length: 64 })
  keyHash: string;

  @Index()
  @Column({ name: 'key_prefix', length: 16 })
  keyPrefix: string;

  @Column({ type: 'text', array: true })
  permissions: ApiKeyPermission[];

  @Column({ name: 'expires_at', type: 'timestamp with time zone', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'last_used_at', type: 'timestamp with time zone', nullable: true })
  lastUsedAt: Date | null;

  @Index()
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'created_by_id', nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  /**
   * Check if the API key is valid for use.
   * A key is valid if it is active and not expired.
   */
  isValid(): boolean {
    if (!this.isActive) {
      return false;
    }
    if (this.expiresAt && new Date() >= this.expiresAt) {
      return false;
    }
    return true;
  }

  /**
   * Check if the API key has expired.
   */
  isExpired(): boolean {
    return this.expiresAt !== null && new Date() >= this.expiresAt;
  }

  /**
   * Check if the API key has a specific permission.
   */
  hasPermission(permission: ApiKeyPermission): boolean {
    return this.permissions.includes(permission);
  }

  /**
   * Check if the API key has all of the specified permissions.
   */
  hasAllPermissions(permissions: ApiKeyPermission[]): boolean {
    return permissions.every((p) => this.permissions.includes(p));
  }

  /**
   * Check if the API key has any of the specified permissions.
   */
  hasAnyPermission(permissions: ApiKeyPermission[]): boolean {
    return permissions.some((p) => this.permissions.includes(p));
  }
}
