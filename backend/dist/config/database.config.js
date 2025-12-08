"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
exports.initializeDatabase = initializeDatabase;
exports.closeDatabase = closeDatabase;
exports.checkDatabaseHealth = checkDatabaseHealth;
exports.getPoolStatistics = getPoolStatistics;
const typeorm_1 = require("typeorm");
const dotenv_1 = __importDefault(require("dotenv"));
const user_entity_1 = require("@features/users/user.entity");
const role_entity_1 = require("@features/roles/role.entity");
const permission_entity_1 = require("@features/permissions/permission.entity");
const refresh_token_entity_1 = require("@features/auth/entities/refresh-token.entity");
const tenant_entity_1 = require("@features/tenants/tenant.entity");
const tag_entity_1 = require("@features/tags/tag.entity");
const customer_entity_1 = require("@features/customers/customer.entity");
const broadcast_entity_1 = require("@features/broadcasts/broadcast.entity");
const template_group_entity_1 = require("@features/templates/template-group.entity");
const template_translation_entity_1 = require("@features/templates/template-translation.entity");
const group_entity_1 = require("@features/groups/group.entity");
const media_entity_1 = require("@features/media/media.entity");
// Channel and Provider entities
const channel_entity_1 = require("@features/channels/channel.entity");
const provider_entity_1 = require("@features/providers/provider.entity");
const channel_account_entity_1 = require("@features/channel-accounts/channel-account.entity");
// Teams entities
const team_entity_1 = require("@features/teams/entities/team.entity");
const team_member_entity_1 = require("@features/teams/entities/team-member.entity");
const team_channel_account_entity_1 = require("@features/teams/entities/team-channel-account.entity");
// Inbox entities
const conversation_entity_1 = require("@features/inbox/entities/conversation.entity");
const conversation_message_entity_1 = require("@features/inbox/entities/conversation-message.entity");
const conversation_note_entity_1 = require("@features/inbox/entities/conversation-note.entity");
const conversation_assignment_entity_1 = require("@features/inbox/entities/conversation-assignment.entity");
// Custom fields entity
const custom_field_entity_1 = require("@features/custom-fields/custom-field.entity");
const logger_config_1 = require("./logger.config");
const constants_1 = require("./constants");
dotenv_1.default.config();
/**
 * Parse integer from environment variable with fallback to default value.
 */
function parseIntEnv(envValue, defaultValue) {
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
    max: parseIntEnv(process.env.DB_POOL_MAX, constants_1.DB_CONSTANTS.CONNECTION_POOL_MAX),
    min: parseIntEnv(process.env.DB_POOL_MIN, constants_1.DB_CONSTANTS.CONNECTION_POOL_MIN),
    idleTimeoutMillis: parseIntEnv(process.env.DB_POOL_IDLE_TIMEOUT_MS, constants_1.DB_CONSTANTS.CONNECTION_IDLE_TIMEOUT_MS),
    connectionTimeoutMillis: parseIntEnv(process.env.DB_POOL_CONNECTION_TIMEOUT_MS, constants_1.DB_CONSTANTS.CONNECTION_TIMEOUT_MS),
    acquireTimeoutMillis: parseIntEnv(process.env.DB_POOL_ACQUIRE_TIMEOUT_MS, constants_1.DB_CONSTANTS.ACQUIRE_TIMEOUT_MS),
    statement_timeout: parseIntEnv(process.env.DB_STATEMENT_TIMEOUT_MS, constants_1.DB_CONSTANTS.STATEMENT_TIMEOUT_MS),
};
/**
 * Retry configuration for connection initialization.
 */
const retryConfig = {
    maxAttempts: parseIntEnv(process.env.DB_RETRY_ATTEMPTS, constants_1.DB_CONSTANTS.MAX_RETRY_ATTEMPTS),
    delayMs: parseIntEnv(process.env.DB_RETRY_DELAY_MS, constants_1.DB_CONSTANTS.RETRY_DELAY_MS),
};
/**
 * TypeORM DataSource configuration options for PostgreSQL.
 */
const dataSourceOptions = {
    type: 'postgres',
    host: databaseConfig.host,
    port: databaseConfig.port,
    username: databaseConfig.username,
    password: process.env.DATABASE_PASSWORD,
    database: databaseConfig.database,
    synchronize: false, // Never use synchronize in production
    logging: process.env.NODE_ENV === 'development',
    entities: [
        user_entity_1.User,
        role_entity_1.Role,
        permission_entity_1.Permission,
        refresh_token_entity_1.RefreshToken,
        tenant_entity_1.Tenant,
        tag_entity_1.Tag,
        customer_entity_1.Customer,
        broadcast_entity_1.Broadcast,
        template_group_entity_1.WhatsAppTemplateGroup,
        template_translation_entity_1.TemplateTranslation,
        group_entity_1.CustomerGroup,
        media_entity_1.Media,
        // Channel and Provider entities
        channel_entity_1.Channel,
        provider_entity_1.Provider,
        channel_account_entity_1.ChannelAccount,
        // Teams entities
        team_entity_1.Team,
        team_member_entity_1.TeamMember,
        team_channel_account_entity_1.TeamChannelAccount,
        // Inbox entities
        conversation_entity_1.Conversation,
        conversation_message_entity_1.ConversationMessage,
        conversation_note_entity_1.ConversationNote,
        conversation_assignment_entity_1.ConversationAssignment,
        // Custom fields entity
        custom_field_entity_1.CustomFieldDefinition,
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
exports.AppDataSource = new typeorm_1.DataSource(dataSourceOptions);
/**
 * Sleep utility for retry delays.
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Initialize database connection with error handling, logging, and retry logic.
 * This function should be called during application startup.
 */
async function initializeDatabase() {
    let lastError = null;
    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
        try {
            logger_config_1.logger.info('Initializing database connection...', {
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
            await exports.AppDataSource.initialize();
            logger_config_1.logger.info('Database connection established successfully', {
                database: databaseConfig.database,
                isInitialized: exports.AppDataSource.isInitialized,
            });
            return exports.AppDataSource;
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error('Unknown error');
            logger_config_1.logger.error('Failed to initialize database connection', {
                error: lastError.message,
                host: databaseConfig.host,
                port: databaseConfig.port,
                database: databaseConfig.database,
                attempt,
                maxAttempts: retryConfig.maxAttempts,
            });
            if (attempt < retryConfig.maxAttempts) {
                logger_config_1.logger.info(`Retrying database connection in ${retryConfig.delayMs}ms...`, {
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
async function closeDatabase() {
    if (exports.AppDataSource.isInitialized) {
        try {
            logger_config_1.logger.info('Closing database connection...');
            await exports.AppDataSource.destroy();
            logger_config_1.logger.info('Database connection closed successfully');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_config_1.logger.error('Error closing database connection', { error: errorMessage });
            throw error;
        }
    }
}
/**
 * Check database connection health.
 * Useful for health check endpoints.
 */
async function checkDatabaseHealth() {
    if (!exports.AppDataSource.isInitialized) {
        return false;
    }
    try {
        await exports.AppDataSource.query('SELECT 1');
        return true;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger_config_1.logger.warn('Database health check failed', { error: errorMessage });
        return false;
    }
}
/**
 * Get current pool statistics (for monitoring/debugging).
 * Note: This accesses internal pg pool state and may not be available in all scenarios.
 */
function getPoolStatistics() {
    if (!exports.AppDataSource.isInitialized) {
        return null;
    }
    // Access the underlying pg pool if available
    const driver = exports.AppDataSource.driver;
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
