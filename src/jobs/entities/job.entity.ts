import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChronoRun } from './chrono-run.entity';
import { Channel } from '../../messaging/entities/channel.entity';
import { UserFunction } from './function.entity';

export type TargetType = 'HTTP' | 'MESSAGE' | 'FUNCTION';
export type LastRunStatus = 'SUCCESS' | 'FAILED' | 'PENDING' | null;

@Entity('chronos')
export class Chrono {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 140 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', length: 120 })
  cron: string;

  @Column({ type: 'varchar', length: 80, default: 'UTC' })
  timezone: string;

  @Column({ type: 'varchar', length: 12, default: 'POST' })
  method: string;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  url?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  headers?: Record<string, string> | null;

  @Column({ type: 'jsonb', nullable: true })
  payload?: Record<string, unknown> | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'target_type', type: 'varchar', length: 10, default: 'HTTP' })
  targetType: TargetType;

  @Column({ type: 'jsonb', nullable: true })
  config?: Record<string, unknown> | null;

  @Column({ name: 'channel_id', type: 'uuid', nullable: true })
  channelId?: string | null;

  @ManyToOne(() => Channel, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'channel_id', referencedColumnName: 'id' })
  channel?: Channel | null;

  @Column({ name: 'message_template', type: 'text', nullable: true })
  messageTemplate?: string | null;

  @Column({ name: 'recipients', type: 'jsonb', nullable: true })
  recipients?: string[] | null;

  @Column({ name: 'function_id', type: 'uuid', nullable: true })
  functionId?: string | null;

  @ManyToOne(() => UserFunction, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'function_id', referencedColumnName: 'id' })
  functionRef?: UserFunction | null;

  @Column({ name: 'extras', type: 'jsonb', nullable: true })
  extras?: Record<string, unknown> | null;

  @Column({ name: 'last_run_at', type: 'timestamptz', nullable: true })
  lastRunAt?: Date | null;

  @Column({ name: 'last_run_status', type: 'varchar', length: 16, nullable: true })
  lastRunStatus?: LastRunStatus;

  @Column({ name: 'next_run_at', type: 'timestamptz', nullable: true })
  nextRunAt?: Date | null;

  @Column({ name: 'is_recurring', type: 'boolean', default: true })
  isRecurring: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => ChronoRun, (run) => run.chrono)
  runs?: ChronoRun[];
}
