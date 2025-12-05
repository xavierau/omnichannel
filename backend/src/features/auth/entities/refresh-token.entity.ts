import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/user.entity';

@Entity('refresh_tokens')
@Index(['userId', 'revoked']) // Composite index for common query
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Token identifier for constant-time lookup (not hashed)
  @Index({ unique: true })
  @Column({ name: 'token_id', unique: true })
  tokenId: string;

  // Only the secret part is hashed (using SHA256)
  @Column({ name: 'token_secret_hash' })
  tokenSecretHash: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ default: false })
  revoked: boolean;

  @Column({ name: 'ip_address', type: 'varchar', nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Helper method to check if token is valid
  isValid(): boolean {
    return !this.revoked && this.expiresAt > new Date();
  }
}
