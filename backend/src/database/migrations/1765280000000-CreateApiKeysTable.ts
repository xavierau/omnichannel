import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey, TableUnique } from 'typeorm';

export class CreateApiKeysTable1765280000000 implements MigrationInterface {
  name = 'CreateApiKeysTable1765280000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create api_keys table
    await queryRunner.createTable(
      new Table({
        name: 'api_keys',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tenant_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'channel_account_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'key_hash',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'key_prefix',
            type: 'varchar',
            length: '16',
            isNullable: false,
          },
          {
            name: 'permissions',
            type: 'text',
            isArray: true,
            isNullable: false,
          },
          {
            name: 'expires_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'last_used_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_by_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Add unique constraint for tenant_id + key_hash
    await queryRunner.createUniqueConstraint(
      'api_keys',
      new TableUnique({
        name: 'UQ_api_keys_tenant_key_hash',
        columnNames: ['tenant_id', 'key_hash'],
      })
    );

    // Add indexes
    await queryRunner.createIndex(
      'api_keys',
      new TableIndex({
        name: 'IDX_api_keys_tenant_id',
        columnNames: ['tenant_id'],
      })
    );

    await queryRunner.createIndex(
      'api_keys',
      new TableIndex({
        name: 'IDX_api_keys_key_prefix',
        columnNames: ['key_prefix'],
      })
    );

    await queryRunner.createIndex(
      'api_keys',
      new TableIndex({
        name: 'IDX_api_keys_tenant_channel_account',
        columnNames: ['tenant_id', 'channel_account_id'],
      })
    );

    await queryRunner.createIndex(
      'api_keys',
      new TableIndex({
        name: 'IDX_api_keys_is_active',
        columnNames: ['is_active'],
      })
    );

    // Add foreign keys
    await queryRunner.createForeignKey(
      'api_keys',
      new TableForeignKey({
        name: 'FK_api_keys_tenant',
        columnNames: ['tenant_id'],
        referencedTableName: 'tenants',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'api_keys',
      new TableForeignKey({
        name: 'FK_api_keys_channel_account',
        columnNames: ['channel_account_id'],
        referencedTableName: 'channel_accounts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'api_keys',
      new TableForeignKey({
        name: 'FK_api_keys_created_by',
        columnNames: ['created_by_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey('api_keys', 'FK_api_keys_created_by');
    await queryRunner.dropForeignKey('api_keys', 'FK_api_keys_channel_account');
    await queryRunner.dropForeignKey('api_keys', 'FK_api_keys_tenant');

    // Drop indexes
    await queryRunner.dropIndex('api_keys', 'IDX_api_keys_is_active');
    await queryRunner.dropIndex('api_keys', 'IDX_api_keys_tenant_channel_account');
    await queryRunner.dropIndex('api_keys', 'IDX_api_keys_key_prefix');
    await queryRunner.dropIndex('api_keys', 'IDX_api_keys_tenant_id');

    // Drop unique constraint
    await queryRunner.dropUniqueConstraint('api_keys', 'UQ_api_keys_tenant_key_hash');

    // Drop table
    await queryRunner.dropTable('api_keys');
  }
}
