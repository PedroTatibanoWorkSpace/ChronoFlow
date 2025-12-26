import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { CronExpression, parseExpression } from 'cron-parser';
import { DateTime } from 'luxon';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { Chrono } from './entities/job.entity';
import { ChronoRun } from './entities/chrono-run.entity';
import { JobRepository } from './repositories/job.repository';

@Injectable()
export class JobsService {
  constructor(
    private readonly repository: JobRepository,
    @InjectQueue('chrono-executions')
    private readonly queue: Queue,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateJobDto): Promise<Chrono> {
    const timezone =
      dto.timezone ??
      this.configService.get<string>('defaultTimezone') ??
      'UTC';
    const isActive = dto.isActive ?? true;
    const targetType = (
      dto.targetType ?? 'HTTP'
    ).toUpperCase() as Chrono['targetType'];

    if (targetType !== 'HTTP') {
      throw new BadRequestException(
        `targetType ${String(targetType)} not supported yet`,
      );
    }

    const cron = this.normalizeCron(dto.cron);
    const nextRunAt = isActive ? this.computeNextRun(cron, timezone) : null;

    const chrono = await this.repository.create({
      name: dto.name,
      description: dto.description,
      cron,
      timezone,
      url: dto.url,
      method: (dto.method ?? 'POST').toUpperCase(),
      headers: dto.headers ?? null,
      payload: dto.payload ?? null,
      isActive,
      targetType,
      config: dto.config ?? null,
      lastRunStatus: null,
      nextRunAt,
    });

    return chrono;
  }

  async findAll(): Promise<Chrono[]> {
    return this.repository.findAll();
  }

  async findOne(id: string): Promise<Chrono> {
    const chrono = await this.repository.findById(id);
    if (!chrono) {
      throw new NotFoundException('Chrono not found');
    }
    return chrono;
  }

  async update(id: string, dto: UpdateJobDto): Promise<Chrono> {
    const existing = await this.findOne(id);
    const timezone = dto.timezone ?? existing.timezone;
    const cron = dto.cron
      ? this.normalizeCron(dto.cron)
      : existing.cron;
    const isActive = dto.isActive ?? existing.isActive;
    const targetType = (
      dto.targetType ?? existing.targetType
    ).toUpperCase() as Chrono['targetType'];

    if (targetType !== 'HTTP') {
      throw new BadRequestException(
        `targetType ${String(targetType)} not supported yet`,
      );
    }
    let nextRunAt = existing.nextRunAt;

    if (dto.cron || dto.timezone || isActive) {
      nextRunAt = isActive ? this.computeNextRun(cron, timezone) : null;
    }

    const updated = await this.repository.update(id, {
      ...dto,
      timezone,
      cron,
      nextRunAt,
      isActive,
      method: dto.method ? dto.method.toUpperCase() : existing.method,
      targetType,
      config: dto.config ?? existing.config ?? null,
    });

    if (!updated) {
      throw new NotFoundException('Chrono not found');
    }

    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repository.remove(id);
  }

  async pause(id: string): Promise<Chrono> {
    const chrono = await this.update(id, { isActive: false });
    return chrono;
  }

  async resume(id: string): Promise<Chrono> {
    const chrono = await this.update(id, { isActive: true });
    return chrono;
  }

  async triggerNow(id: string, manual = true): Promise<ChronoRun> {
    const chrono = await this.findOne(id);
    const now = new Date();

    const run = await this.repository.createRun({
      chronoId: chrono.id,
      status: 'PENDING',
      scheduledFor: now,
      attempt: 1,
    });

    await this.queue.add(
      'execute-chrono',
      {
        chronoId: chrono.id,
        runId: run.id,
        manual,
      },
      {
        removeOnComplete: true,
        attempts: this.configService.get<number>('bullAttempts') ?? 3,
        backoff: {
          type: 'exponential',
          delay: this.configService.get<number>('bullBackoffMs') ?? 5000,
        },
      },
    );

    return run;
  }

  async listRuns(chronoId: string, skip = 0, take = 20): Promise<ChronoRun[]> {
    await this.findOne(chronoId);
    return this.repository.listRuns(chronoId, skip, take);
  }

  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
  computeNextRun(cron: string, timezone: string): Date | null {
    try {
      const now = DateTime.now().setZone(timezone) as unknown as DateTime;
      const interval = parseExpression(cron, {
        currentDate: now.toJSDate(),
        tz: timezone,
      }) as CronExpression;
      return interval.next().toDate();
    } catch {
      throw new BadRequestException(`Invalid cron expression: ${cron}`);
    }
  }
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

  private normalizeCron(input: string): string {
    const simplified = input.trim();
    const normalized = this.normalizeText(simplified);

    const everyMinutes = normalized.match(
      /^(\d+)\s*(min|mins|minute|minutes)$/i,
    );
    if (everyMinutes) {
      const minutes = Number(everyMinutes[1]);
      if (Number.isNaN(minutes) || minutes <= 0) {
        throw new BadRequestException(`Invalid interval: ${input}`);
      }
      // */1 is acceptable and equivalent to every minute.
      return `*/${minutes} * * * *`;
    }

    const everyHours = normalized.match(
      /^(\d+)\s*(h|hr|hrs|hour|hours|hora|horas)$/i,
    );
    if (everyHours) {
      const hours = Number(everyHours[1]);
      if (Number.isNaN(hours) || hours <= 0) {
        throw new BadRequestException(`Invalid interval: ${input}`);
      }
      if (hours <= 23) {
        return `0 */${hours} * * *`;
      }
      if (hours % 24 === 0) {
        const days = hours / 24;
        return `0 0 */${days} * *`;
      }
      throw new BadRequestException(
        `Invalid hourly interval (use <=23h or multiples of 24h): ${input}`,
      );
    }

    const dailyAt = normalized.match(
      /^(every\s+day|daily|todo\s+dia|todos\s+os\s+dias)\s+(?:at\s+|as\s+)?(\d{1,2})(?::(\d{2}))?$/i,
    );
    if (dailyAt) {
      const hour = Number(dailyAt[2]);
      const minute = dailyAt[3] ? Number(dailyAt[3]) : 0;
      if (
        Number.isNaN(hour) ||
        Number.isNaN(minute) ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59
      ) {
        throw new BadRequestException(`Invalid daily time: ${input}`);
      }
      return `${minute} ${hour} * * *`;
    }

    // Fallback: treat as regular cron. Validation happens in computeNextRun.
    return simplified;
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }
}
