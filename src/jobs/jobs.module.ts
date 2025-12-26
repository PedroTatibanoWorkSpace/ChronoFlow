import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { Chrono } from './entities/job.entity';
import { ChronoRun } from './entities/chrono-run.entity';
import { JobRepository } from './repositories/job.repository';
import { SchedulerService } from './scheduler.service';
import { ChronoProcessor } from './processors/chrono.processor';
import { HttpExecutor } from './executors/http.executor';
import { ExecutorFactory } from './executors/executor.factory';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Chrono, ChronoRun]),
    BullModule.registerQueueAsync({
      name: 'chrono-executions',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        defaultJobOptions: {
          removeOnComplete: true,
          attempts: config.get<number>('bullAttempts') ?? 3,
          backoff: {
            type: 'exponential',
            delay: config.get<number>('bullBackoffMs') ?? 5000,
          },
        },
      }),
    }),
  ],
  controllers: [JobsController],
  providers: [
    JobsService,
    JobRepository,
    SchedulerService,
    ChronoProcessor,
    HttpExecutor,
    ExecutorFactory,
  ],
})
export class JobsModule {}
