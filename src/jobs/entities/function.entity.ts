import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Channel } from '../../messaging/entities/channel.entity';

@Entity('functions')
export class UserFunction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  code: string;

  @Column({ type: 'varchar', length: 40, default: 'vm' })
  runtime: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'varchar', length: 120, nullable: true })
  checksum?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  limits?: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  state?: Record<string, unknown> | null;

  @Column({ name: 'channel_id', type: 'uuid', nullable: true })
  channelId?: string | null;

  @ManyToOne(() => Channel, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'channel_id', referencedColumnName: 'id' })
  channel?: Channel | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
