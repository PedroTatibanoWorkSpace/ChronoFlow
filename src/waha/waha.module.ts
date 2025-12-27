import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WahaService } from './services/waha.service';
import { WahaSessionsController } from './controllers/waha.sessions.controller';

@Module({
  imports: [ConfigModule],
  controllers: [WahaSessionsController],
  providers: [WahaService],
})
export class WahaModule {}
