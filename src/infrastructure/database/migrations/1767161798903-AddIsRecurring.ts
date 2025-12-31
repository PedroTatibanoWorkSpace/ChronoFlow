import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsRecurring1767161798903 implements MigrationInterface {
    name = 'AddIsRecurring1767161798903'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chronos" ADD "is_recurring" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chronos" DROP COLUMN "is_recurring"`);
    }

}
