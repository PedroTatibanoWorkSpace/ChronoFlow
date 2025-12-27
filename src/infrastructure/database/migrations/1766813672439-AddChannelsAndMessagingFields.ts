import { MigrationInterface, QueryRunner } from "typeorm";

export class AddChannelsAndMessagingFields1766813672439 implements MigrationInterface {
    name = 'AddChannelsAndMessagingFields1766813672439'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "channels" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(140) NOT NULL, "description" text, "channel_type" character varying(32) NOT NULL, "provider" character varying(32) NOT NULL, "config" jsonb, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_bc603823f3f741359c2339389f9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "chronos" ADD "channel_id" uuid`);
        await queryRunner.query(`ALTER TABLE "chronos" ADD "message_template" text`);
        await queryRunner.query(`ALTER TABLE "chronos" ADD "recipients" jsonb`);
        await queryRunner.query(`ALTER TABLE "chronos" ADD CONSTRAINT "FK_21ac64648ff2fcbed75a56dec1d" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chronos" DROP CONSTRAINT "FK_21ac64648ff2fcbed75a56dec1d"`);
        await queryRunner.query(`ALTER TABLE "chronos" DROP COLUMN "recipients"`);
        await queryRunner.query(`ALTER TABLE "chronos" DROP COLUMN "message_template"`);
        await queryRunner.query(`ALTER TABLE "chronos" DROP COLUMN "channel_id"`);
        await queryRunner.query(`DROP TABLE "channels"`);
    }

}
