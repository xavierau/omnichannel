import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Channel entity represents messaging channel types (WhatsApp, SMS, Email).
 * Channels are system-level definitions, not tenant-specific.
 */
@Entity('channels')
export class Channel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 50 })
  code: string; // 'whatsapp', 'sms', 'email'

  @Column({ length: 100 })
  name: string; // 'WhatsApp', 'SMS', 'Email'

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', name: 'required_customer_fields', default: '[]' })
  requiredCustomerFields: string[]; // e.g., ['whatsappNumber'] for WhatsApp, ['email'] for Email

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
