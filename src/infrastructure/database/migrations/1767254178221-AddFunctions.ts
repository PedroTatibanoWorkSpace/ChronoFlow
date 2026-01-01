import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFunctions1767254178221 implements MigrationInterface {
    name = 'AddFunctions1767254178221'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "functions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" text NOT NULL, "runtime" character varying(40) NOT NULL DEFAULT 'vm', "version" integer NOT NULL DEFAULT '1', "checksum" character varying(120), "limits" jsonb, "state" jsonb, "channel_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_203889d2ae5a98ffc137739301e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "chronos" ADD "function_id" uuid`);
        await queryRunner.query(`ALTER TABLE "chronos" ADD "extras" jsonb`);
        await queryRunner.query(`ALTER TABLE "functions" ADD CONSTRAINT "FK_6dc8e49d59b2c17635558f76702" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chronos" ADD CONSTRAINT "FK_c9b325f9fe19b889fb9162f5837" FOREIGN KEY ("function_id") REFERENCES "functions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chronos" DROP CONSTRAINT "FK_c9b325f9fe19b889fb9162f5837"`);
        await queryRunner.query(`ALTER TABLE "functions" DROP CONSTRAINT "FK_6dc8e49d59b2c17635558f76702"`);
        await queryRunner.query(`ALTER TABLE "chronos" DROP COLUMN "extras"`);
        await queryRunner.query(`ALTER TABLE "chronos" DROP COLUMN "function_id"`);
        await queryRunner.query(`DROP TABLE "functions"`);
    }

}
