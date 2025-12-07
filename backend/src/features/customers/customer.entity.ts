import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
  Index,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { Tag } from '../tags/tag.entity';

@Entity('customers')
@Index(['tenantId', 'whatsappNumber'], { unique: true })
export class Customer {
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

  @Index()
  @Column({ name: 'whatsapp_number', length: 20 })
  whatsappNumber: string;

  @Column({ type: 'jsonb', name: 'custom_fields', nullable: true, default: {} })
  customFields: Record<string, unknown>;

  @ManyToMany(() => Tag)
  @JoinTable({
    name: 'customer_tags',
    joinColumn: { name: 'customer_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags: Tag[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
