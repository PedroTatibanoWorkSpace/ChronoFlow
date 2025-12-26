import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class InitChronos1766704086808 implements MigrationInterface {
  name = 'InitChronos1766704086808';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.createTable(
      new Table({
        name: 'chronos',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'name', type: 'varchar', length: '140' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'cron', type: 'varchar', length: '120' },
          { name: 'timezone', type: 'varchar', length: '80', default: `'UTC'` },
          { name: 'method', type: 'varchar', length: '12', default: `'POST'` },
          { name: 'url', type: 'varchar', length: '1024' },
          { name: 'headers', type: 'jsonb', isNullable: true },
          { name: 'payload', type: 'jsonb', isNullable: true },
          { name: 'isActive', type: 'boolean', default: true },
          {
            name: 'targetType',
            type: 'varchar',
            length: '10',
            default: `'HTTP'`,
          },
          { name: 'config', type: 'jsonb', isNullable: true },
          { name: 'lastRunAt', type: 'timestamptz', isNullable: true },
          {
            name: 'lastRunStatus',
            type: 'varchar',
            length: '16',
            isNullable: true,
          },
          { name: 'nextRunAt', type: 'timestamptz', isNullable: true },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'chrono_runs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'chrono_id', type: 'uuid' },
          { name: 'scheduledFor', type: 'timestamptz' },
          { name: 'startedAt', type: 'timestamptz', isNullable: true },
          { name: 'finishedAt', type: 'timestamptz', isNullable: true },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: `'PENDING'`,
          },
          { name: 'httpStatus', type: 'integer', isNullable: true },
          { name: 'responseSnippet', type: 'text', isNullable: true },
          { name: 'errorMessage', type: 'text', isNullable: true },
          { name: 'attempt', type: 'int', default: 1 },
          { name: 'durationMs', type: 'int', isNullable: true },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'chrono_runs',
      new TableForeignKey({
        columnNames: ['chrono_id'],
        referencedTableName: 'chronos',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('chrono_runs');
    const fk = table?.foreignKeys.find((key) =>
      key.columnNames.includes('chrono_id'),
    );
    if (fk) {
      await queryRunner.dropForeignKey('chrono_runs', fk);
    }
    await queryRunner.dropTable('chrono_runs');
    await queryRunner.dropTable('chronos');
  }
}
