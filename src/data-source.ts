import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Chrono } from './jobs/entities/job.entity';
import { ChronoRun } from './jobs/entities/chrono-run.entity';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [Chrono, ChronoRun],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
});
