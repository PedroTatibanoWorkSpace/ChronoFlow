import { MigrationInterface, QueryRunner } from "typeorm";

export class AddChannelStatus1767156950128 implements MigrationInterface {
    name = 'AddChannelStatus1767156950128'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "channels" ADD "status" character varying(32) NOT NULL DEFAULT 'UNKNOWN'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "channels" DROP COLUMN "status"`);
    }

}
