import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullRootModuleOptions } from '@nestjs/bullmq';

export const bullConfig = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService): BullRootModuleOptions => ({
    connection: {
      url: config.get<string>('redisUrl'),
    },
    prefix: config.get<string>('bullPrefix'),
  }),
};
