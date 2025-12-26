import * as path from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';

export const typeOrmConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    url: config.get<string>('databaseUrl'),
    autoLoadEntities: true,
    entities: [path.join(__dirname, '../../**/*.entity.{ts,js}')],
    synchronize: false,
    migrationsRun: false,
    migrations: [path.join(__dirname, './migrations/*.{ts,js}')],
    logging: config.get<string>('nodeEnv') !== 'production',
  }),
};
