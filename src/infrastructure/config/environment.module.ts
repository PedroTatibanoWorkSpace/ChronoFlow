import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envConfiguration } from './env.configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfiguration],
    }),
  ],
})
export class EnvironmentModule {}
