import 'reflect-metadata';

// Mock Bull before any imports
const mockQueue = {
  process: jest.fn(),
  add: jest.fn().mockResolvedValue({ id: 'job-1' }),
  on: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
  getJob: jest.fn(),
  getJobs: jest.fn(),
  removeJobs: jest.fn(),
};

const MockBull = jest.fn(() => mockQueue);

jest.mock('bull', () => MockBull);

describe('Bull Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('BULL_CONFIG', () => {
    it('should use default Redis URL when BULL_REDIS_URL is not set', async () => {
      delete process.env.BULL_REDIS_URL;
      const { BULL_CONFIG } = await import('../bull.config');

      expect(BULL_CONFIG.redis).toBe('redis://localhost:6379');
    });

    it('should use BULL_REDIS_URL from environment when set', async () => {
      process.env.BULL_REDIS_URL = 'redis://custom-host:6380';
      const { BULL_CONFIG } = await import('../bull.config');

      expect(BULL_CONFIG.redis).toBe('redis://custom-host:6380');
    });

    it('should use default concurrency when BULL_CONCURRENCY is not set', async () => {
      delete process.env.BULL_CONCURRENCY;
      const { BULL_CONFIG } = await import('../bull.config');

      expect(BULL_CONFIG.concurrency).toBe(5);
    });

    it('should use BULL_CONCURRENCY from environment when set', async () => {
      process.env.BULL_CONCURRENCY = '10';
      const { BULL_CONFIG } = await import('../bull.config');

      expect(BULL_CONFIG.concurrency).toBe(10);
    });

    it('should have default job options with retry settings', async () => {
      const { BULL_CONFIG } = await import('../bull.config');

      expect(BULL_CONFIG.defaultJobOptions).toEqual({
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 100,
      });
    });
  });

  describe('createQueue', () => {
    it('should create a Bull queue with the given name', async () => {
      const { createQueue, BULL_CONFIG } = await import('../bull.config');

      const queue = createQueue('test-queue');

      expect(MockBull).toHaveBeenCalledWith('test-queue', BULL_CONFIG.redis, {
        defaultJobOptions: BULL_CONFIG.defaultJobOptions,
      });
      expect(queue).toBeDefined();
    });

    it('should create multiple independent queues', async () => {
      const { createQueue } = await import('../bull.config');

      const queue1 = createQueue('queue-1');
      const queue2 = createQueue('queue-2');

      expect(MockBull).toHaveBeenCalledTimes(2);
      expect(queue1).toBeDefined();
      expect(queue2).toBeDefined();
    });
  });
});
