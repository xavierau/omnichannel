import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { ChannelAccount } from '../channel-accounts/channel-account.entity';
import { TemplateTranslation } from './template-translation.entity';
import { TemplateCategory } from './enums';

@Entity('whatsapp_template_groups')
@Index(['tenantId', 'channelAccountId', 'name'], { unique: true })
export class WhatsAppTemplateGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  /**
   * Channel account this template belongs to.
   * Templates are approved per WABA (WhatsApp Business Account),
   * so each channel account has its own set of approved templates.
   */
  @Index()
  @Column({ name: 'channel_account_id', nullable: true })
  channelAccountId: string | null;

  @ManyToOne(() => ChannelAccount, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'channel_account_id' })
  channelAccount: ChannelAccount | null;

  @Column({ length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: TemplateCategory,
  })
  category: TemplateCategory;

  @Column({ type: 'jsonb', name: 'custom_fields', nullable: true, default: {} })
  customFields: Record<string, unknown>;

  @OneToMany(() => TemplateTranslation, (translation) => translation.templateGroup)
  translations: TemplateTranslation[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
