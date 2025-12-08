import Redis from 'ioredis';
/**
 * Result of a rate limit check operation.
 */
export interface RateLimitResult {
    /** Whether the request is allowed under the rate limit */
    allowed: boolean;
    /** Number of remaining requests in the current window */
    remaining: number;
    /** When the current window resets */
    resetAt: Date;
    /** Seconds to wait before retrying (only set when blocked) */
    retryAfter?: number;
}
/**
 * Configuration options for the rate limiter.
 */
export interface RateLimitConfig {
    /** Maximum messages per second (default: 80 for Meta standard tier) */
    messagesPerSecond: number;
    /** Sliding window size in milliseconds (default: 1000) */
    windowSizeMs: number;
}
/**
 * Information about current rate limit status for monitoring.
 */
export interface RateLimitInfo {
    /** Current message count in the window */
    currentRate: number;
    /** Maximum messages allowed per window */
    limit: number;
    /** Whether the channel account is in a backoff period */
    isInBackoff: boolean;
}
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
export declare class MessagingRateLimiterService {
    private readonly redis;
    private readonly config;
    constructor(redis: Redis);
    /**
     * Create a rate limiter with custom configuration.
     * Use this for testing or when you need different limits.
     */
    withConfig(config: RateLimitConfig): MessagingRateLimiterService;
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
    checkRateLimit(channelAccountId: string): Promise<RateLimitResult>;
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
    acquireToken(channelAccountId: string, timeoutMs?: number): Promise<boolean>;
    /**
     * Record a rate limit error from Meta and apply backoff.
     *
     * When Meta returns a rate limit error, this method sets a backoff
     * flag in Redis that prevents further requests until the backoff expires.
     *
     * @param channelAccountId - The channel account that received the error
     * @param retryAfterSeconds - Seconds to wait before retrying (from Meta's Retry-After header)
     */
    handleRateLimitError(channelAccountId: string, retryAfterSeconds?: number): Promise<void>;
    /**
     * Check if a channel account is currently in a backoff period.
     *
     * During backoff, no messages should be sent to avoid further
     * rate limit violations.
     *
     * @param channelAccountId - The channel account to check
     * @returns True if in backoff period, false otherwise
     */
    isInBackoff(channelAccountId: string): Promise<boolean>;
    /**
     * Clear the backoff period for a channel account.
     *
     * This can be called when a successful message is sent after
     * the backoff period, or for administrative purposes.
     *
     * @param channelAccountId - The channel account to clear backoff for
     */
    clearBackoff(channelAccountId: string): Promise<void>;
    /**
     * Get rate limit information for monitoring purposes.
     *
     * @param channelAccountId - The channel account to get info for
     * @returns Current rate limit status and configuration
     */
    getRateLimitInfo(channelAccountId: string): Promise<RateLimitInfo>;
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
    isRateLimitError(error: unknown): boolean;
    /**
     * Extract the Retry-After value from an error response.
     *
     * Meta may include a Retry-After header indicating how long
     * to wait before retrying.
     *
     * @param error - The error object to extract from
     * @returns Number of seconds to wait, or undefined if not present
     */
    extractRetryAfter(error: unknown): number | undefined;
    /**
     * Create a degraded result when Redis is unavailable.
     *
     * This implements fail-open behavior - when we can't check
     * the rate limit, we allow the request to proceed.
     */
    private createDegradedResult;
    /**
     * Sleep for a specified duration.
     */
    private sleep;
}
