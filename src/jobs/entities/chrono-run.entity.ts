import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Chrono } from './job.entity';

export type ChronoRunStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

@Entity('chrono_runs')
export class ChronoRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'chrono_id', type: 'uuid' })
  chronoId: string;

  @ManyToOne(() => Chrono, (chrono) => chrono.runs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chrono_id', referencedColumnName: 'id' })
  chrono: Chrono;

  @Column({ name: 'scheduled_for', type: 'timestamptz' })
  scheduledFor: Date;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt?: Date | null;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt?: Date | null;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'PENDING' })
  status: ChronoRunStatus;

  @Column({ name: 'http_status', type: 'integer', nullable: true })
  httpStatus?: number | null;

  @Column({ name: 'response_snippet', type: 'text', nullable: true })
  responseSnippet?: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string | null;

  @Column({ name: 'attempt', type: 'int', default: 1 })
  attempt: number;

  @Column({ name: 'result', type: 'jsonb', nullable: true })
  result?: unknown | null;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs?: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
