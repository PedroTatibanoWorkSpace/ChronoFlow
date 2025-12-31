import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WahaService } from './services/waha.service';
import { WahaSessionsController } from './controllers/waha.sessions.controller';
import { WahaWebhooksController } from './controllers/waha.webhooks.controller';
import { Channel } from '../messaging/entities/channel.entity';
import { ChannelRepository } from '../messaging/repositories/channel.repository';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Channel])],
  controllers: [WahaSessionsController, WahaWebhooksController],
  providers: [WahaService, ChannelRepository],
  exports: [WahaService, ChannelRepository, TypeOrmModule],
})
export class WahaModule {}
