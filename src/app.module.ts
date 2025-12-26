import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EnvironmentModule } from './infrastructure/config/environment.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    EnvironmentModule,
    DatabaseModule,
    QueueModule,
    JobsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
