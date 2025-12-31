import 'dotenv/config';
import * as path from 'path';
import { DataSource } from 'typeorm';

export const seedPaths = [
  path.join(__dirname, '/infrastructure/database/seeds/*.{ts,js}'),
];

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [path.join(__dirname, '/**/*.entity.{ts,js}')],
  migrations: [
    path.join(__dirname, '/infrastructure/database/migrations/*.{ts,js}'),
  ],
  synchronize: false,
});
