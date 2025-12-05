import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  Index,
} from 'typeorm';
import { Role } from '../roles/role.entity';

export enum PermissionResource {
  BROADCASTS = 'broadcasts',
  CUSTOMERS = 'customers',
  TEMPLATES = 'templates',
  CONVERSATIONS = 'conversations',
  USERS = 'users',
  SETTINGS = 'settings',
  API_KEYS = 'api_keys',
  CHANNELS = 'channels',
  CUSTOM_FIELDS = 'custom_fields',
  NOTES = 'notes',
}

export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage', // Full control (implies all above)
}

export enum PermissionScope {
  ALL = 'all',
  OWN = 'own',
}

@Entity('permissions')
@Index(['resource', 'action', 'scope'], { unique: true })
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: PermissionResource,
  })
  resource: PermissionResource;

  @Column({
    type: 'enum',
    enum: PermissionAction,
  })
  action: PermissionAction;

  @Column({
    type: 'enum',
    enum: PermissionScope,
  })
  scope: PermissionScope;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper method to get permission string format: resource:action:scope
  toString(): string {
    return `${this.resource}:${this.action}:${this.scope}`;
  }
}
