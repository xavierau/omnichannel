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
import { WhatsAppTemplateGroup } from './template-group.entity';
import { TemplateStatus, TemplateQuality, HeaderType, ButtonType } from './enums';

export interface TemplateButton {
  id: string;
  type: ButtonType;
  text: string;
  url?: string;
  phoneNumber?: string;
}

@Entity('template_translations')
@Index(['templateGroupId', 'language'], { unique: true })
export class TemplateTranslation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'template_group_id' })
  templateGroupId: string;

  @ManyToOne(() => WhatsAppTemplateGroup, (group) => group.translations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_group_id' })
  templateGroup: WhatsAppTemplateGroup;

  @Column({ length: 10 })
  language: string;

  @Column({
    type: 'enum',
    enum: TemplateStatus,
    default: TemplateStatus.PENDING,
  })
  status: TemplateStatus;

  @Column({
    type: 'enum',
    enum: TemplateQuality,
    nullable: true,
  })
  quality: TemplateQuality | null;

  @Column({
    type: 'enum',
    enum: HeaderType,
    name: 'header_type',
    nullable: true,
  })
  headerType: HeaderType | null;

  @Column({ name: 'header_content', type: 'text', nullable: true })
  headerContent: string | null;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'text', nullable: true })
  footer: string | null;

  @Column({ type: 'jsonb', default: [] })
  buttons: TemplateButton[];

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'meta_template_id', type: 'varchar', length: 50, nullable: true })
  metaTemplateId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
