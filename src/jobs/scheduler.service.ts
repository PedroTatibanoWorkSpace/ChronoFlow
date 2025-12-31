import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { JobsService } from './jobs.service';
import { JobRepository } from './repositories/job.repository';
import { Chrono } from './entities/job.entity';

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);
  private timer: NodeJS.Timeout | null = null;
  private readonly intervalMs: number;

  constructor(
    private readonly jobsService: JobsService,
    private readonly repository: JobRepository,
    @InjectQueue('chrono-executions')
    private readonly queue: Queue,
    configService: ConfigService,
  ) {
    this.intervalMs = 30000;
    const envInterval = Number(process.env.SCHEDULER_INTERVAL_MS);
    if (!Number.isNaN(envInterval) && envInterval > 0) {
      this.intervalMs = envInterval;
    } else if (configService.get<number>('schedulerIntervalMs')) {
      this.intervalMs = configService.get<number>(
        'schedulerIntervalMs',
      ) as number;
    }
  }

  onModuleInit() {
    this.logger.log(`Starting scheduler loop (every ${this.intervalMs}ms)`);
    this.timer = setInterval(() => {
      void this.dispatchDueChronos();
    }, this.intervalMs);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async dispatchDueChronos() {
    const now = new Date();
    const dueChronos = await this.repository.findDue(now);

    for (const chrono of dueChronos) {
      try {
        await this.enqueueChrono(chrono);
        await this.bumpNextRun(chrono);
      } catch (error) {
        this.logger.error(
          `Failed to enqueue chrono ${chrono.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  private async enqueueChrono(chrono: Chrono) {
    const scheduledFor = chrono.nextRunAt ?? new Date();
    const jobId = `${chrono.id}-${scheduledFor.getTime()}`;

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
        removeOnComplete: true,
        attempts: 1,
      },
    );
  }

  private async bumpNextRun(chrono: Chrono) {
    if (!chrono.isRecurring) {
      await this.repository.update(chrono.id, {
        nextRunAt: null,
        lastRunAt: chrono.nextRunAt,
        lastRunStatus: 'PENDING',
        isActive: false,
      });
      return;
    }

    const nextRun = this.jobsService.computeNextRun(
      chrono.cron,
      chrono.timezone,
    );
    await this.repository.update(chrono.id, {
      nextRunAt: nextRun,
      lastRunAt: chrono.nextRunAt,
      lastRunStatus: 'PENDING',
    });
  }
}
