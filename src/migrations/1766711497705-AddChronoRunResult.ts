import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChronoRunResult1766711497705 implements MigrationInterface {
  name = 'AddChronoRunResult1766711497705';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chrono_runs" ADD "result" jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chrono_runs" DROP COLUMN "result"`);
  }
}
