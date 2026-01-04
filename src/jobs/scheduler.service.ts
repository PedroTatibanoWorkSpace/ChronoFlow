import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { JobRepository } from './repositories/job.repository';
import { Chrono } from './entities/job.entity';
import { computeNextRun as computeNextRunUtil } from './utils/schedule.util';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly attempts: number;
  private readonly backoffMs: number;

  constructor(
    private readonly repository: JobRepository,
    @InjectQueue('chrono-executions')
    private readonly queue: Queue,
    configService: ConfigService,
  ) {
    this.attempts = configService.get<number>('bullAttempts') ?? 3;
    this.backoffMs = configService.get<number>('bullBackoffMs') ?? 5000;
  }

  onModuleInit() {
    void this.scheduleAll();
  }

  async scheduleChrono(chrono: Chrono) {
    if (!chrono.isActive || !chrono.nextRunAt) {
      await this.unschedule(chrono.id);
      return;
    }

    const jobId = this.buildJobId(chrono.id);
    await this.removeExisting(jobId);

    const scheduledFor = chrono.nextRunAt;
    const delay = Math.max(0, scheduledFor.getTime() - Date.now());

    const run = await this.repository.createRun({
      chronoId: chrono.id,
      status: 'PENDING',
      scheduledFor,
      attempt: 1,
    });

    await this.queue.add(
      'execute-chrono',
      {
        chronoId: chrono.id,
        runId: run.id,
        manual: false,
      },
      {
        jobId,
        delay,
        removeOnComplete: true,
        attempts: this.attempts,
        backoff: { type: 'exponential', delay: this.backoffMs },
      },
    );

    this.logger.debug(
      `Scheduled chrono ${chrono.id} for ${scheduledFor.toISOString()} (delay ${delay}ms)`,
    );
  }

  async unschedule(chronoId: string) {
    const jobId = this.buildJobId(chronoId);
    await this.removeExisting(jobId);
  }

  async scheduleNext(chrono: Chrono) {
    if (!chrono.isActive) {
      await this.unschedule(chrono.id);
      return;
    }

    if (!chrono.isRecurring) {
      await this.repository.update(chrono.id, {
        isActive: false,
        nextRunAt: null,
      });
      await this.unschedule(chrono.id);
      return;
    }

    const nextRun = computeNextRunUtil(chrono.cron, chrono.timezone);
    if (!nextRun) {
      await this.repository.update(chrono.id, {
        isActive: false,
        nextRunAt: null,
      });
      await this.unschedule(chrono.id);
      return;
    }

    const updated = await this.repository.update(chrono.id, {
      nextRunAt: nextRun,
      isActive: true,
    });
    if (updated) {
      await this.scheduleChrono(updated);
    }
  }

  private async scheduleAll() {
    const active = await this.repository.findSchedulable();
    for (const chrono of active) {
      await this.scheduleChrono(chrono);
    }
  }

  private async removeExisting(jobId: string) {
    try {
      const existing = await this.queue.getJob(jobId);
      if (existing) {
        await existing.remove();
      }
    } catch (error) {
      try {
        await this.queue.clean(0, 'active' as any);
        await this.queue.clean(0, 'wait' as any);
        await this.queue.clean(0, 'delayed' as any);
        const again = await this.queue.getJob(jobId);
        if (again) await again.remove();
      } catch (inner) {
        this.logger.warn(
          `Could not remove existing job ${jobId}`,
          inner instanceof Error ? inner.message : String(inner),
        );
      }
    }
  }

  private buildJobId(chronoId: string) {
    return `chrono-${chronoId}`;
  }
}
