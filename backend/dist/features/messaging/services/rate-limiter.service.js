"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var MessagingRateLimiterService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingRateLimiterService = void 0;
const tsyringe_1 = require("tsyringe");
const ioredis_1 = __importDefault(require("ioredis"));
const logger_config_1 = require("../../../config/logger.config");
/**
 * Meta rate limit error codes.
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes
 */
const META_RATE_LIMIT_CODES = [4, 17, 341, 368];
/**
 * Default configuration for Meta Cloud API standard tier.
 */
const DEFAULT_CONFIG = {
    messagesPerSecond: 80,
    windowSizeMs: 1000,
};
/**
 * Default backoff duration in seconds when no retry-after is provided.
 */
const DEFAULT_BACKOFF_SECONDS = 60;
/**
 * Redis key prefix for rate limiting.
 */
const RATE_LIMIT_KEY_PREFIX = 'rate_limit:messaging:';
/**
 * Redis key prefix for backoff tracking.
 */
const BACKOFF_KEY_PREFIX = 'rate_limit:backoff:';
/**
 * Service for managing rate limiting for Meta WhatsApp Cloud API.
 *
 * Implements sliding window rate limiting using Redis sorted sets.
 * This ensures accurate rate limiting across distributed workers.
 *
 * Features:
 * - Sliding window algorithm for smooth rate limiting
 * - Backoff handling for provider-reported rate limits
 * - Graceful degradation when Redis is unavailable (fail-open)
 * - Configurable limits per channel account
 *
 * @remarks
 * Meta's standard tier allows 80 messages per second.
 * Different business tiers have different daily unique user limits.
 *
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/overview#throughput
 */
let MessagingRateLimiterService = MessagingRateLimiterService_1 = class MessagingRateLimiterService {
    redis;
    config;
    constructor(redis) {
        this.redis = redis;
        this.config = DEFAULT_CONFIG;
    }
    /**
     * Create a rate limiter with custom configuration.
     * Use this for testing or when you need different limits.
     */
    withConfig(config) {
        const instance = new MessagingRateLimiterService_1(this.redis);
        Object.assign(instance, { config });
        return instance;
    }
    /**
     * Check if a message can be sent for the given channel account.
     *
     * Uses a sliding window algorithm with Redis sorted sets:
     * 1. Remove entries outside the current window
     * 2. Count entries in the window
     * 3. Add current timestamp if under limit
     *
     * @param channelAccountId - The channel account to check
     * @returns Rate limit result with allowed status and remaining quota
     */
    async checkRateLimit(channelAccountId) {
        const key = `${RATE_LIMIT_KEY_PREFIX}${channelAccountId}`;
        const now = Date.now();
        const windowStart = now - this.config.windowSizeMs;
        try {
            const pipeline = this.redis.pipeline();
            // Remove entries outside the sliding window
            pipeline.zremrangebyscore(key, 0, windowStart);
            // Count entries in the current window
            pipeline.zcard(key);
            // Add current timestamp with unique suffix to handle sub-millisecond requests
            const uniqueId = `${now}-${Math.random().toString(36).substring(2, 9)}`;
            pipeline.zadd(key, now.toString(), uniqueId);
            // Set TTL to prevent memory leaks (2x window size)
            pipeline.expire(key, Math.ceil(this.config.windowSizeMs / 1000) * 2);
            const results = await pipeline.exec();
            // Handle null results (Redis error)
            if (!results) {
                logger_config_1.logger.warn('Redis pipeline returned null results, allowing request (fail-open)', {
                    channelAccountId,
                });
                return this.createDegradedResult(now);
            }
            // Extract current count from zcard result
            const currentCount = results[1]?.[1] ?? 0;
            const allowed = currentCount < this.config.messagesPerSecond;
            const result = {
                allowed,
                remaining: Math.max(0, this.config.messagesPerSecond - currentCount - 1),
                resetAt: new Date(now + this.config.windowSizeMs),
                retryAfter: allowed ? undefined : 1,
            };
            if (!allowed) {
                logger_config_1.logger.debug('Rate limit exceeded', {
                    channelAccountId,
                    currentCount,
                    limit: this.config.messagesPerSecond,
                });
            }
            return result;
        }
        catch (error) {
            logger_config_1.logger.error('Redis error during rate limit check, allowing request (fail-open)', {
                channelAccountId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return this.createDegradedResult(now);
        }
    }
    /**
     * Acquire a rate limit token, blocking until available or timeout.
     *
     * This method will retry checking the rate limit until either:
     * - A token is available (returns true)
     * - The timeout is reached (returns false)
     *
     * @param channelAccountId - The channel account to acquire a token for
     * @param timeoutMs - Maximum time to wait in milliseconds (default: 5000)
     * @returns True if token was acquired, false if timeout was reached
     */
    async acquireToken(channelAccountId, timeoutMs = 5000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            const result = await this.checkRateLimit(channelAccountId);
            if (result.allowed) {
                return true;
            }
            // Wait before retry - use retryAfter or default to 100ms
            const waitTime = result.retryAfter ? result.retryAfter * 1000 : 100;
            await this.sleep(Math.min(waitTime, timeoutMs - (Date.now() - startTime)));
        }
        logger_config_1.logger.warn('Rate limit token acquisition timed out', {
            channelAccountId,
            timeoutMs,
        });
        return false;
    }
    /**
     * Record a rate limit error from Meta and apply backoff.
     *
     * When Meta returns a rate limit error, this method sets a backoff
     * flag in Redis that prevents further requests until the backoff expires.
     *
     * @param channelAccountId - The channel account that received the error
     * @param retryAfterSeconds - Seconds to wait before retrying (from Meta's Retry-After header)
     */
    async handleRateLimitError(channelAccountId, retryAfterSeconds) {
        const backoffKey = `${BACKOFF_KEY_PREFIX}${channelAccountId}`;
        const backoffSeconds = retryAfterSeconds ?? DEFAULT_BACKOFF_SECONDS;
        try {
            await this.redis.setex(backoffKey, backoffSeconds, 'true');
            logger_config_1.logger.info('Rate limit backoff set', {
                channelAccountId,
                backoffSeconds,
            });
        }
        catch (error) {
            logger_config_1.logger.error('Failed to set rate limit backoff', {
                channelAccountId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * Check if a channel account is currently in a backoff period.
     *
     * During backoff, no messages should be sent to avoid further
     * rate limit violations.
     *
     * @param channelAccountId - The channel account to check
     * @returns True if in backoff period, false otherwise
     */
    async isInBackoff(channelAccountId) {
        const backoffKey = `${BACKOFF_KEY_PREFIX}${channelAccountId}`;
        try {
            const result = await this.redis.get(backoffKey);
            return result === 'true';
        }
        catch (error) {
            logger_config_1.logger.error('Failed to check backoff status', {
                channelAccountId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            // On error, assume not in backoff to allow messages
            return false;
        }
    }
    /**
     * Clear the backoff period for a channel account.
     *
     * This can be called when a successful message is sent after
     * the backoff period, or for administrative purposes.
     *
     * @param channelAccountId - The channel account to clear backoff for
     */
    async clearBackoff(channelAccountId) {
        const backoffKey = `${BACKOFF_KEY_PREFIX}${channelAccountId}`;
        try {
            await this.redis.del(backoffKey);
            logger_config_1.logger.debug('Rate limit backoff cleared', {
                channelAccountId,
            });
        }
        catch (error) {
            logger_config_1.logger.error('Failed to clear rate limit backoff', {
                channelAccountId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * Get rate limit information for monitoring purposes.
     *
     * @param channelAccountId - The channel account to get info for
     * @returns Current rate limit status and configuration
     */
    async getRateLimitInfo(channelAccountId) {
        const key = `${RATE_LIMIT_KEY_PREFIX}${channelAccountId}`;
        const now = Date.now();
        const windowStart = now - this.config.windowSizeMs;
        try {
            // Clean up old entries and get current count
            await this.redis.zremrangebyscore(key, 0, windowStart);
            const currentRate = await this.redis.zcard(key);
            const isInBackoff = await this.isInBackoff(channelAccountId);
            return {
                currentRate,
                limit: this.config.messagesPerSecond,
                isInBackoff,
            };
        }
        catch (error) {
            logger_config_1.logger.error('Failed to get rate limit info', {
                channelAccountId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return {
                currentRate: 0,
                limit: this.config.messagesPerSecond,
                isInBackoff: false,
            };
        }
    }
    /**
     * Check if an error is a Meta rate limit error.
     *
     * Meta uses specific error codes for rate limiting:
     * - 4: API Too Many Calls
     * - 17: User request limit reached
     * - 341: Application request limit reached
     * - 368: Temporarily blocked for violating WhatsApp policies
     *
     * @param error - The error object to check
     * @returns True if this is a rate limit error
     */
    isRateLimitError(error) {
        if (!error || typeof error !== 'object') {
            return false;
        }
        const err = error;
        const errorCode = err.response?.data?.error?.code;
        if (typeof errorCode !== 'number') {
            return false;
        }
        return META_RATE_LIMIT_CODES.includes(errorCode);
    }
    /**
     * Extract the Retry-After value from an error response.
     *
     * Meta may include a Retry-After header indicating how long
     * to wait before retrying.
     *
     * @param error - The error object to extract from
     * @returns Number of seconds to wait, or undefined if not present
     */
    extractRetryAfter(error) {
        if (!error || typeof error !== 'object') {
            return undefined;
        }
        const err = error;
        const retryAfterHeader = err.response?.headers?.['retry-after'];
        if (!retryAfterHeader) {
            return undefined;
        }
        const parsed = parseInt(retryAfterHeader, 10);
        return isNaN(parsed) ? undefined : parsed;
    }
    /**
     * Create a degraded result when Redis is unavailable.
     *
     * This implements fail-open behavior - when we can't check
     * the rate limit, we allow the request to proceed.
     */
    createDegradedResult(now) {
        return {
            allowed: true,
            remaining: -1, // Indicates degraded mode
            resetAt: new Date(now + this.config.windowSizeMs),
        };
    }
    /**
     * Sleep for a specified duration.
     */
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.MessagingRateLimiterService = MessagingRateLimiterService;
exports.MessagingRateLimiterService = MessagingRateLimiterService = MessagingRateLimiterService_1 = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)('RedisClient')),
    __metadata("design:paramtypes", [ioredis_1.default])
], MessagingRateLimiterService);
