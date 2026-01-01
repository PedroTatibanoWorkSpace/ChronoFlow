import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { Chrono } from './entities/job.entity';
import { ChronoRun } from './entities/chrono-run.entity';
import { UserFunction } from './entities/function.entity';
import { JobRepository } from './repositories/job.repository';
import { SchedulerService } from './scheduler.service';
import { ChronoProcessor } from './processors/chrono.processor';
import { HttpExecutor } from './executors/http.executor';
import { ExecutorFactory } from './executors/executor.factory';
import { MessageExecutor } from './executors/message.executor';
import { WahaModule } from '../waha/waha.module';
import { FunctionExecutor } from './executors/function.executor';
import { FunctionsRepository } from './repositories/functions.repository';

@Module({
  imports: [
    WahaModule,
    ConfigModule,
    TypeOrmModule.forFeature([Chrono, ChronoRun, UserFunction]),
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
    FunctionsRepository,
    SchedulerService,
    ChronoProcessor,
    HttpExecutor,
    MessageExecutor,
    FunctionExecutor,
    ExecutorFactory,
  ],
})
export class JobsModule {}
