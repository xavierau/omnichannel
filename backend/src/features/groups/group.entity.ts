import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
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

@Entity('customer_groups')
@Index(['tenantId', 'name'], { unique: true })
export class CustomerGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_static', default: false })
  isStatic: boolean;

  @Column({ type: 'jsonb', name: 'member_ids', nullable: true })
  memberIds: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  criteria: GroupCriteria | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
