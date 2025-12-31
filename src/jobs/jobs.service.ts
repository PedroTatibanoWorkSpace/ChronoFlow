import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { Chrono } from './entities/job.entity';
import { ChronoRun } from './entities/chrono-run.entity';
import { JobRepository } from './repositories/job.repository';
import {
  computeNextRun as computeNextRunUtil,
  parseSchedule,
} from './utils/schedule.util';
import { SchedulerService } from './scheduler.service';

type Schedule = { cron: string; nextRunAt: Date | null; isRecurring: boolean };

@Injectable()
export class JobsService {
  constructor(
    private readonly repository: JobRepository,
    @InjectQueue('chrono-executions') private readonly queue: Queue,
    private readonly config: ConfigService,
    private readonly scheduler: SchedulerService,
  ) {}

  async create(dto: CreateJobDto): Promise<Chrono> {
    const timezone =
      dto.timezone ?? this.config.get('defaultTimezone') ?? 'UTC';
    const isActive = dto.isActive ?? true;
    const targetType = this.pickTargetType(dto.targetType ?? 'HTTP');

    if (targetType === 'MESSAGE') this.assertMessage(dto);

    const schedule = this.parseSchedule(dto.cron, timezone, isActive);

    const chrono = await this.repository.create({
      name: dto.name,
      description: dto.description,
      cron: schedule.cron,
      timezone,
      url: dto.url,
      method: (dto.method ?? 'POST').toUpperCase(),
      headers: dto.headers ?? null,
      payload: dto.payload ?? null,
      isActive,
      targetType,
      config: dto.config ?? null,
      channelId: dto.channelId ?? undefined,
      messageTemplate: dto.messageTemplate ?? undefined,
      recipients: dto.recipients ?? undefined,
      lastRunStatus: null,
      nextRunAt: schedule.nextRunAt,
      isRecurring: schedule.isRecurring,
    });

    await this.scheduler.scheduleChrono(chrono);
    return chrono;
  }

  findAll(): Promise<Chrono[]> {
    return this.repository.findAll();
  }

  async findOne(id: string): Promise<Chrono> {
    const chrono = await this.repository.findById(id);
    if (!chrono) throw new NotFoundException('Chrono not found');
    return chrono;
  }

  async update(id: string, dto: UpdateJobDto): Promise<Chrono> {
    const existing = await this.findOne(id);

    const timezone = dto.timezone ?? existing.timezone;
    const isActive = dto.isActive ?? existing.isActive;
    const targetType = this.pickTargetType(
      dto.targetType ?? existing.targetType,
    );

    const channelId = dto.channelId ?? existing.channelId ?? undefined;
    const messageTemplate = dto.messageTemplate ?? existing.messageTemplate ?? undefined;
    const recipients = dto.recipients ?? existing.recipients ?? undefined;

    if (targetType === 'MESSAGE') {
      this.assertMessage({ ...existing, ...dto, channelId, messageTemplate, recipients } as any);
    }

    const cronInput = dto.cron ?? existing.cron;
    const schedule =
      dto.cron || dto.timezone || dto.isActive !== undefined
        ? this.parseSchedule(cronInput, timezone, isActive)
        : ({
            cron: existing.cron,
            nextRunAt: existing.nextRunAt,
            isRecurring: existing.isRecurring,
          } as Schedule);

    const updated = await this.repository.update(id, {
      ...dto,
      timezone,
      cron: schedule.cron,
      nextRunAt: schedule.nextRunAt,
      isRecurring: schedule.isRecurring,
      isActive,
      targetType,
      method: dto.method ? dto.method.toUpperCase() : existing.method,
      config: dto.config ?? existing.config ?? null,
      channelId,
      messageTemplate,
      recipients,
    });

    if (!updated) throw new NotFoundException('Chrono not found');
    await this.scheduler.scheduleChrono(updated);
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.scheduler.unschedule(id);
    await this.repository.remove(id);
  }

  pause(id: string): Promise<Chrono> {
    return this.update(id, { isActive: false });
  }

  resume(id: string): Promise<Chrono> {
    return this.update(id, { isActive: true });
  }

  async triggerNow(id: string, manual = true): Promise<ChronoRun> {
    const chrono = await this.findOne(id);

    const run = await this.repository.createRun({
      chronoId: chrono.id,
      status: 'PENDING',
      scheduledFor: new Date(),
      attempt: 1,
    });

    await this.queue.add(
      'execute-chrono',
      { chronoId: chrono.id, runId: run.id, manual },
      {
        removeOnComplete: true,
        attempts: this.config.get<number>('bullAttempts') ?? 3,
        backoff: { type: 'exponential', delay: this.config.get<number>('bullBackoffMs') ?? 5000 },
      },
    );

    return run;
  }

  async listRuns(chronoId: string, skip = 0, take = 20): Promise<ChronoRun[]> {
    await this.findOne(chronoId);
    return this.repository.listRuns(chronoId, skip, take);
  }

  computeNextRun(cron: string, timezone: string): Date | null {
    return computeNextRunUtil(cron, timezone);
  }

  private parseSchedule(
    input: string,
    timezone: string,
    isActive: boolean,
  ): Schedule {
    const parsed = parseSchedule(input, timezone);
    return {
      cron: parsed.cron,
      nextRunAt: isActive ? parsed.nextRunAt : null,
      isRecurring: parsed.isRecurring,
    };
  }

  private pickTargetType(value: string): Chrono['targetType'] {
    const t = String(value).toUpperCase() as Chrono['targetType'];
    if (t !== 'HTTP' && t !== 'MESSAGE') {
      throw new BadRequestException(`targetType ${t} not supported yet`);
    }
    return t;
  }

  private assertMessage(dto: { channelId?: string | null; messageTemplate?: string | null; recipients?: string[] | null }) {
    if (!dto.channelId) throw new BadRequestException('channelId is required for MESSAGE target');
    if (!dto.messageTemplate) throw new BadRequestException('messageTemplate is required for MESSAGE target');
    if (!dto.recipients?.length) throw new BadRequestException('recipients is required for MESSAGE target');
  }
}
