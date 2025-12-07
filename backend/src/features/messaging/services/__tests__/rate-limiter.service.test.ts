import 'reflect-metadata';
import { MessagingRateLimiterService, RateLimitConfig } from '../rate-limiter.service';
import Redis from 'ioredis';

// Mock logger
jest.mock('../../../../config/logger.config', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('MessagingRateLimiterService', () => {
  let rateLimiterService: MessagingRateLimiterService;
  let mockRedis: jest.Mocked<Redis>;

  const channelAccountId = 'channel-account-123';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Create mock Redis client
    mockRedis = {
      pipeline: jest.fn(),
      zremrangebyscore: jest.fn(),
      zcard: jest.fn(),
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      quit: jest.fn(),
    } as unknown as jest.Mocked<Redis>;

    rateLimiterService = new MessagingRateLimiterService(mockRedis);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('checkRateLimit', () => {
    it('should allow messages when under the rate limit', async () => {
      const mockPipeline = {
        zremrangebyscore: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 0], // zremrangebyscore result
          [null, 10], // zcard result - 10 messages in current window
          [null, 1], // zadd result
          [null, 1], // expire result
        ]),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline as unknown as ReturnType<Redis['pipeline']>);

      const result = await rateLimiterService.checkRateLimit(channelAccountId);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(69); // 80 - 10 - 1 = 69
      expect(result.retryAfter).toBeUndefined();
    });

    it('should block messages when at the rate limit', async () => {
      const mockPipeline = {
        zremrangebyscore: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 0],
          [null, 80], // At limit
          [null, 1],
          [null, 1],
        ]),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline as unknown as ReturnType<Redis['pipeline']>);

      const result = await rateLimiterService.checkRateLimit(channelAccountId);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBe(1);
    });

    it('should block messages when over the rate limit', async () => {
      const mockPipeline = {
        zremrangebyscore: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 0],
          [null, 100], // Over limit
          [null, 1],
          [null, 1],
        ]),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline as unknown as ReturnType<Redis['pipeline']>);

      const result = await rateLimiterService.checkRateLimit(channelAccountId);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBe(1);
    });

    it('should use the correct Redis key pattern', async () => {
      const mockPipeline = {
        zremrangebyscore: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 0],
          [null, 0],
          [null, 1],
          [null, 1],
        ]),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline as unknown as ReturnType<Redis['pipeline']>);

      await rateLimiterService.checkRateLimit(channelAccountId);

      // Verify zremrangebyscore was called with correct key pattern
      expect(mockPipeline.zremrangebyscore).toHaveBeenCalledWith(
        `rate_limit:messaging:${channelAccountId}`,
        0,
        expect.any(Number)
      );
    });

    it('should handle Redis pipeline execution errors gracefully', async () => {
      const mockPipeline = {
        zremrangebyscore: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline as unknown as ReturnType<Redis['pipeline']>);

      // Should not throw, should default to allowing the message (fail-open)
      const result = await rateLimiterService.checkRateLimit(channelAccountId);

      expect(result.allowed).toBe(true);
    });
  });

  describe('acquireToken', () => {
    it('should return true immediately when under rate limit', async () => {
      const mockPipeline = {
        zremrangebyscore: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 0],
          [null, 10], // Under limit
          [null, 1],
          [null, 1],
        ]),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline as unknown as ReturnType<Redis['pipeline']>);

      const result = await rateLimiterService.acquireToken(channelAccountId);

      expect(result).toBe(true);
    });

    it('should retry and eventually succeed when rate limit clears', async () => {
      jest.useRealTimers(); // Use real timers for this test

      let callCount = 0;
      const mockPipeline = {
        zremrangebyscore: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockImplementation(async () => {
          callCount++;
          if (callCount < 3) {
            return [
              [null, 0],
              [null, 85], // Over limit first two times
              [null, 1],
              [null, 1],
            ];
          }
          return [
            [null, 0],
            [null, 10], // Under limit on third attempt
            [null, 1],
            [null, 1],
          ];
        }),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline as unknown as ReturnType<Redis['pipeline']>);

      // Use a short timeout since we want to test the retry logic
      const result = await rateLimiterService.acquireToken(channelAccountId, 5000);

      expect(result).toBe(true);
      expect(callCount).toBe(3);

      // Restore fake timers for other tests
      jest.useFakeTimers();
    }, 10000); // Increase test timeout

    it('should return false when timeout is reached', async () => {
      jest.useRealTimers(); // Use real timers for this test

      const mockPipeline = {
        zremrangebyscore: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 0],
          [null, 100], // Always over limit
          [null, 1],
          [null, 1],
        ]),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline as unknown as ReturnType<Redis['pipeline']>);

      // Very short timeout
      const result = await rateLimiterService.acquireToken(channelAccountId, 200);

      expect(result).toBe(false);

      // Restore fake timers for other tests
      jest.useFakeTimers();
    }, 5000);
  });

  describe('handleRateLimitError', () => {
    it('should set backoff key with provided retry-after seconds', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      await rateLimiterService.handleRateLimitError(channelAccountId, 120);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        `rate_limit:backoff:${channelAccountId}`,
        120,
        'true'
      );
    });

    it('should use default backoff of 60 seconds when retry-after not provided', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      await rateLimiterService.handleRateLimitError(channelAccountId);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        `rate_limit:backoff:${channelAccountId}`,
        60,
        'true'
      );
    });
  });

  describe('isInBackoff', () => {
    it('should return true when backoff key exists', async () => {
      mockRedis.get.mockResolvedValue('true');

      const result = await rateLimiterService.isInBackoff(channelAccountId);

      expect(result).toBe(true);
      expect(mockRedis.get).toHaveBeenCalledWith(
        `rate_limit:backoff:${channelAccountId}`
      );
    });

    it('should return false when backoff key does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await rateLimiterService.isInBackoff(channelAccountId);

      expect(result).toBe(false);
    });

    it('should return false when backoff key has expired', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await rateLimiterService.isInBackoff(channelAccountId);

      expect(result).toBe(false);
    });
  });

  describe('clearBackoff', () => {
    it('should remove the backoff key', async () => {
      mockRedis.del.mockResolvedValue(1);

      await rateLimiterService.clearBackoff(channelAccountId);

      expect(mockRedis.del).toHaveBeenCalledWith(
        `rate_limit:backoff:${channelAccountId}`
      );
    });
  });

  describe('getRateLimitInfo', () => {
    it('should return current rate limit information', async () => {
      mockRedis.zremrangebyscore.mockResolvedValue(0);
      mockRedis.zcard.mockResolvedValue(45);
      mockRedis.get.mockResolvedValue(null);

      const info = await rateLimiterService.getRateLimitInfo(channelAccountId);

      expect(info.currentRate).toBe(45);
      expect(info.limit).toBe(80);
      expect(info.isInBackoff).toBe(false);
    });

    it('should indicate when in backoff period', async () => {
      mockRedis.zremrangebyscore.mockResolvedValue(0);
      mockRedis.zcard.mockResolvedValue(0);
      mockRedis.get.mockResolvedValue('true');

      const info = await rateLimiterService.getRateLimitInfo(channelAccountId);

      expect(info.currentRate).toBe(0);
      expect(info.limit).toBe(80);
      expect(info.isInBackoff).toBe(true);
    });
  });

  describe('isRateLimitError', () => {
    it('should identify Meta rate limit error code 4', () => {
      const error = {
        response: {
          data: {
            error: { code: 4, message: 'Rate limit exceeded' },
          },
        },
      };

      expect(rateLimiterService.isRateLimitError(error)).toBe(true);
    });

    it('should identify Meta rate limit error code 17', () => {
      const error = {
        response: {
          data: {
            error: { code: 17, message: 'User request limit reached' },
          },
        },
      };

      expect(rateLimiterService.isRateLimitError(error)).toBe(true);
    });

    it('should identify Meta rate limit error code 341', () => {
      const error = {
        response: {
          data: {
            error: { code: 341, message: 'Application request limit reached' },
          },
        },
      };

      expect(rateLimiterService.isRateLimitError(error)).toBe(true);
    });

    it('should identify Meta rate limit error code 368', () => {
      const error = {
        response: {
          data: {
            error: { code: 368, message: 'Temporarily blocked' },
          },
        },
      };

      expect(rateLimiterService.isRateLimitError(error)).toBe(true);
    });

    it('should return false for non-rate-limit errors', () => {
      const error = {
        response: {
          data: {
            error: { code: 100, message: 'Invalid parameter' },
          },
        },
      };

      expect(rateLimiterService.isRateLimitError(error)).toBe(false);
    });

    it('should return false for malformed errors', () => {
      expect(rateLimiterService.isRateLimitError(null)).toBe(false);
      expect(rateLimiterService.isRateLimitError(undefined)).toBe(false);
      expect(rateLimiterService.isRateLimitError({})).toBe(false);
      expect(rateLimiterService.isRateLimitError({ response: {} })).toBe(false);
    });
  });

  describe('extractRetryAfter', () => {
    it('should extract retry-after from error headers', () => {
      const error = {
        response: {
          headers: {
            'retry-after': '120',
          },
        },
      };

      expect(rateLimiterService.extractRetryAfter(error)).toBe(120);
    });

    it('should return undefined when no retry-after header', () => {
      const error = {
        response: {
          headers: {},
        },
      };

      expect(rateLimiterService.extractRetryAfter(error)).toBeUndefined();
    });

    it('should return undefined for malformed errors', () => {
      expect(rateLimiterService.extractRetryAfter(null)).toBeUndefined();
      expect(rateLimiterService.extractRetryAfter({})).toBeUndefined();
    });
  });

  describe('custom configuration', () => {
    it('should use custom rate limit when provided', async () => {
      const customConfig: RateLimitConfig = {
        messagesPerSecond: 40, // Half the default
        windowSizeMs: 1000,
      };

      const baseService = new MessagingRateLimiterService(mockRedis);
      const customService = baseService.withConfig(customConfig);

      const mockPipeline = {
        zremrangebyscore: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 0],
          [null, 35], // Under custom limit of 40
          [null, 1],
          [null, 1],
        ]),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline as unknown as ReturnType<Redis['pipeline']>);

      const result = await customService.checkRateLimit(channelAccountId);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 40 - 35 - 1 = 4
    });
  });

  describe('graceful degradation', () => {
    it('should allow messages when Redis throws an error (fail-open)', async () => {
      mockRedis.pipeline.mockImplementation(() => {
        throw new Error('Redis connection failed');
      });

      const result = await rateLimiterService.checkRateLimit(channelAccountId);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(-1); // Indicates degraded mode
    });

    it('should handle Redis timeout gracefully', async () => {
      const mockPipeline = {
        zremrangebyscore: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Redis timeout')),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline as unknown as ReturnType<Redis['pipeline']>);

      const result = await rateLimiterService.checkRateLimit(channelAccountId);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(-1);
    });
  });
});
