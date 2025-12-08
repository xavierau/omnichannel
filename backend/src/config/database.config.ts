import { DataSource } from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import './env.config'; // Ensure env is loaded first
import { User } from '@features/users/user.entity';
import { Role } from '@features/roles/role.entity';
import { Permission } from '@features/permissions/permission.entity';
import { RefreshToken } from '@features/auth/entities/refresh-token.entity';
import { Tenant } from '@features/tenants/tenant.entity';
import { Tag } from '@features/tags/tag.entity';
import { Customer } from '@features/customers/customer.entity';
import { Broadcast } from '@features/broadcasts/broadcast.entity';
import { WhatsAppTemplateGroup } from '@features/templates/template-group.entity';
import { TemplateTranslation } from '@features/templates/template-translation.entity';
import { CustomerGroup } from '@features/groups/group.entity';
import { Media } from '@features/media/media.entity';

// Channel and Provider entities
import { Channel } from '@features/channels/channel.entity';
import { Provider } from '@features/providers/provider.entity';
import { ChannelAccount } from '@features/channel-accounts/channel-account.entity';

// Teams entities
import { Team } from '@features/teams/entities/team.entity';
import { TeamMember } from '@features/teams/entities/team-member.entity';
import { TeamChannelAccount } from '@features/teams/entities/team-channel-account.entity';

// Inbox entities
import { Conversation } from '@features/inbox/entities/conversation.entity';
import { ConversationMessage } from '@features/inbox/entities/conversation-message.entity';
import { ConversationNote } from '@features/inbox/entities/conversation-note.entity';
import { ConversationAssignment } from '@features/inbox/entities/conversation-assignment.entity';

// Custom fields entity
import { CustomFieldDefinition } from '@features/custom-fields/custom-field.entity';

import { logger } from './logger.config';
import { DB_CONSTANTS } from './constants';

/**
 * Parse integer from environment variable with fallback to default value.
 */
function parseIntEnv(envValue: string | undefined, defaultValue: number): number {
  if (envValue === undefined) {
    return defaultValue;
  }
  const parsed = parseInt(envValue, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Database connection configuration extracted for logging purposes.
 * These values are used both in the DataSource config and for logging.
 */
const databaseConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseIntEnv(process.env.DATABASE_PORT, 5432),
  database: process.env.DATABASE_NAME || 'omnichannel_db',
  username: process.env.DATABASE_USER || 'postgres',
};

/**
 * Database connection pool configuration.
 * All values are configurable via environment variables with sensible defaults.
 */
const poolConfig = {
  max: parseIntEnv(process.env.DB_POOL_MAX, DB_CONSTANTS.CONNECTION_POOL_MAX),
  min: parseIntEnv(process.env.DB_POOL_MIN, DB_CONSTANTS.CONNECTION_POOL_MIN),
  idleTimeoutMillis: parseIntEnv(
    process.env.DB_POOL_IDLE_TIMEOUT_MS,
    DB_CONSTANTS.CONNECTION_IDLE_TIMEOUT_MS
  ),
  connectionTimeoutMillis: parseIntEnv(
    process.env.DB_POOL_CONNECTION_TIMEOUT_MS,
    DB_CONSTANTS.CONNECTION_TIMEOUT_MS
  ),
  acquireTimeoutMillis: parseIntEnv(
    process.env.DB_POOL_ACQUIRE_TIMEOUT_MS,
    DB_CONSTANTS.ACQUIRE_TIMEOUT_MS
  ),
  statement_timeout: parseIntEnv(
    process.env.DB_STATEMENT_TIMEOUT_MS,
    DB_CONSTANTS.STATEMENT_TIMEOUT_MS
  ),
};

/**
 * Retry configuration for connection initialization.
 */
const retryConfig = {
  maxAttempts: parseIntEnv(process.env.DB_RETRY_ATTEMPTS, DB_CONSTANTS.MAX_RETRY_ATTEMPTS),
  delayMs: parseIntEnv(process.env.DB_RETRY_DELAY_MS, DB_CONSTANTS.RETRY_DELAY_MS),
};

/**
 * TypeORM DataSource configuration options for PostgreSQL.
 */
const dataSourceOptions: PostgresConnectionOptions = {
  type: 'postgres',
  host: databaseConfig.host,
  port: databaseConfig.port,
  username: databaseConfig.username,
  password: process.env.DATABASE_PASSWORD,
  database: databaseConfig.database,
  synchronize: false, // Never use synchronize in production
  logging: process.env.NODE_ENV === 'development',
  entities: [
    User,
    Role,
    Permission,
    RefreshToken,
    Tenant,
    Tag,
    Customer,
    Broadcast,
    WhatsAppTemplateGroup,
    TemplateTranslation,
    CustomerGroup,
    Media,
    // Channel and Provider entities
    Channel,
    Provider,
    ChannelAccount,
    // Teams entities
    Team,
    TeamMember,
    TeamChannelAccount,
    // Inbox entities
    Conversation,
    ConversationMessage,
    ConversationNote,
    ConversationAssignment,
    // Custom fields entity
    CustomFieldDefinition,
  ],
  migrations: [__dirname + '/../database/migrations/*.{js,ts}'],
  subscribers: [],

  // Connection pool configuration via pg driver options
  extra: {
    // Pool size settings
    max: poolConfig.max,
    min: poolConfig.min,

    // Timeout settings
    idleTimeoutMillis: poolConfig.idleTimeoutMillis,
    connectionTimeoutMillis: poolConfig.connectionTimeoutMillis,
    acquireTimeoutMillis: poolConfig.acquireTimeoutMillis,

    // Statement timeout for queries
    statement_timeout: poolConfig.statement_timeout,

    // Connection validation - keep pool alive
    allowExitOnIdle: false,
  },
};

export const AppDataSource = new DataSource(dataSourceOptions);

/**
 * Sleep utility for retry delays.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Initialize database connection with error handling, logging, and retry logic.
 * This function should be called during application startup.
 */
export async function initializeDatabase(): Promise<DataSource> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
    try {
      logger.info('Initializing database connection...', {
        host: databaseConfig.host,
        port: databaseConfig.port,
        database: databaseConfig.database,
        attempt,
        maxAttempts: retryConfig.maxAttempts,
        poolConfig: {
          max: poolConfig.max,
          min: poolConfig.min,
          idleTimeoutMillis: poolConfig.idleTimeoutMillis,
          connectionTimeoutMillis: poolConfig.connectionTimeoutMillis,
          acquireTimeoutMillis: poolConfig.acquireTimeoutMillis,
        },
      });

      await AppDataSource.initialize();

      logger.info('Database connection established successfully', {
        database: databaseConfig.database,
        isInitialized: AppDataSource.isInitialized,
      });

      return AppDataSource;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      logger.error('Failed to initialize database connection', {
        error: lastError.message,
        host: databaseConfig.host,
        port: databaseConfig.port,
        database: databaseConfig.database,
        attempt,
        maxAttempts: retryConfig.maxAttempts,
      });

      if (attempt < retryConfig.maxAttempts) {
        logger.info(`Retrying database connection in ${retryConfig.delayMs}ms...`, {
          nextAttempt: attempt + 1,
          maxAttempts: retryConfig.maxAttempts,
        });
        await sleep(retryConfig.delayMs);
      }
    }
  }

  throw lastError;
}

/**
 * Gracefully close database connection.
 * This function should be called during application shutdown.
 */
export async function closeDatabase(): Promise<void> {
  if (AppDataSource.isInitialized) {
    try {
      logger.info('Closing database connection...');
      await AppDataSource.destroy();
      logger.info('Database connection closed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error closing database connection', { error: errorMessage });
      throw error;
    }
  }
}

/**
 * Check database connection health.
 * Useful for health check endpoints.
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  if (!AppDataSource.isInitialized) {
    return false;
  }

  try {
    await AppDataSource.query('SELECT 1');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.warn('Database health check failed', { error: errorMessage });
    return false;
  }
}

/**
 * Get current pool statistics (for monitoring/debugging).
 * Note: This accesses internal pg pool state and may not be available in all scenarios.
 */
export function getPoolStatistics(): Record<string, unknown> | null {
  if (!AppDataSource.isInitialized) {
    return null;
  }

  // Access the underlying pg pool if available
  const driver = AppDataSource.driver as unknown as {
    master?: { pool?: { totalCount?: number; idleCount?: number; waitingCount?: number } };
  };

  const pool = driver?.master?.pool;
  if (!pool) {
    return null;
  }

  return {
    totalConnections: pool.totalCount ?? 'N/A',
    idleConnections: pool.idleCount ?? 'N/A',
    waitingClients: pool.waitingCount ?? 'N/A',
    maxConnections: poolConfig.max,
    minConnections: poolConfig.min,
  };
}
