import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { JobRepository } from '../repositories/job.repository';
import { ExecutorFactory } from '../executors/executor.factory';
import { SchedulerService } from '../scheduler.service';

interface ChronoJobData {
  chronoId: string;
  runId: string;
  manual: boolean;
}

@Processor('chrono-executions')
export class ChronoProcessor extends WorkerHost {
  private readonly logger = new Logger(ChronoProcessor.name);

  constructor(
    private readonly repository: JobRepository,
    private readonly executorFactory: ExecutorFactory,
    private readonly scheduler: SchedulerService,
  ) {
    super();
  }

  async process(job: Job<ChronoJobData>) {
    const { chronoId, runId, manual } = job.data;

    const chrono = await this.repository.findById(chronoId);
    if (!chrono) {
      this.logger.warn(`Chrono not found for job ${job.id}`);
      return;
    }

    const startedAt = new Date();
    await this.repository.updateRun(runId, {
      startedAt,
      status: 'PENDING',
      attempt: job.attemptsMade + 1,
    });

    try {
      const executor = this.executorFactory.get(chrono.targetType);
      const result = await executor.execute(chrono);
      const finishedAt = new Date();

      await this.repository.updateRun(runId, {
        status: result.status,
        finishedAt,
        httpStatus: result.httpStatus ?? undefined,
        responseSnippet: result.responseSnippet ?? undefined,
        errorMessage: result.errorMessage ?? undefined,
        result: result.result ?? undefined,
        durationMs:
          result.durationMs ?? finishedAt.getTime() - startedAt.getTime(),
      });

      await this.repository.update(chrono.id, {
        lastRunAt: finishedAt,
        lastRunStatus: result.status,
        // One-time jobs remain with nextRunAt null (scheduler already disabled).
      });

      if (!manual) {
        await this.scheduler.scheduleNext(chrono);
      }
    } catch (error) {
      const finishedAt = new Date();
      const message = error instanceof Error ? error.message : 'Unknown error';

      await this.repository.updateRun(runId, {
        status: 'FAILED',
        finishedAt,
        errorMessage: message,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      });

      await this.repository.update(chrono.id, {
        lastRunAt: finishedAt,
        lastRunStatus: 'FAILED',
      });

      if (!manual) {
        await this.scheduler.scheduleNext(chrono);
      }

      this.logger.error(
        `Execution failed for chrono ${chrono.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
