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

export enum TagColor {
  PURPLE = 'purple',
  BLUE = 'blue',
  GREEN = 'green',
  GRAY = 'gray',
  YELLOW = 'yellow',
  ORANGE = 'orange',
  RED = 'red',
  PINK = 'pink',
}

@Entity('tags')
@Index(['tenantId', 'name'], { unique: true })
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: TagColor,
    default: TagColor.GRAY,
  })
  color: TagColor;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
