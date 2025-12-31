import { MigrationInterface, QueryRunner } from "typeorm";

export class AllowNullUrlChronos1767160985210 implements MigrationInterface {
    name = 'AllowNullUrlChronos1767160985210'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chronos" ALTER COLUMN "url" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chronos" ALTER COLUMN "url" SET NOT NULL`);
    }

}
