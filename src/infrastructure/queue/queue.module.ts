import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { bullConfig } from './bull.config';

@Module({
  imports: [BullModule.forRootAsync(bullConfig)],
})
export class QueueModule {}
