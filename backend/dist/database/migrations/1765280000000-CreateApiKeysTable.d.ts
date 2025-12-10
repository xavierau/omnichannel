import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class CreateApiKeysTable1765280000000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
