import { MigrationInterface, QueryRunner } from 'typeorm';

export class SnakeCaseColumns1766713536682 implements MigrationInterface {
  name = 'SnakeCaseColumns1766713536682';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chrono_runs" RENAME COLUMN "scheduledFor" TO "scheduled_for"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chrono_runs" RENAME COLUMN "startedAt" TO "started_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chrono_runs" RENAME COLUMN "finishedAt" TO "finished_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chrono_runs" RENAME COLUMN "httpStatus" TO "http_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chrono_runs" RENAME COLUMN "responseSnippet" TO "response_snippet"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chrono_runs" RENAME COLUMN "errorMessage" TO "error_message"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chrono_runs" RENAME COLUMN "durationMs" TO "duration_ms"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chrono_runs" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chrono_runs" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    await queryRunner.query(
      `ALTER TABLE "chronos" RENAME COLUMN "isActive" TO "is_active"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chronos" RENAME COLUMN "targetType" TO "target_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chronos" RENAME COLUMN "lastRunAt" TO "last_run_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chronos" RENAME COLUMN "lastRunStatus" TO "last_run_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chronos" RENAME COLUMN "nextRunAt" TO "next_run_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chronos" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chronos" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chronos" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chronos" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chronos" RENAME COLUMN "next_run_at" TO "nextRunAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chronos" RENAME COLUMN "last_run_status" TO "lastRunStatus"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chronos" RENAME COLUMN "last_run_at" TO "lastRunAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chronos" RENAME COLUMN "target_type" TO "targetType"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chronos" RENAME COLUMN "is_active" TO "isActive"`,
    );

    await queryRunner.query(
      `ALTER TABLE "chrono_runs" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chrono_runs" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chrono_runs" RENAME COLUMN "duration_ms" TO "durationMs"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chrono_runs" RENAME COLUMN "error_message" TO "errorMessage"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chrono_runs" RENAME COLUMN "response_snippet" TO "responseSnippet"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chrono_runs" RENAME COLUMN "http_status" TO "httpStatus"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chrono_runs" RENAME COLUMN "finished_at" TO "finishedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chrono_runs" RENAME COLUMN "started_at" TO "startedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chrono_runs" RENAME COLUMN "scheduled_for" TO "scheduledFor"`,
    );
  }
}
