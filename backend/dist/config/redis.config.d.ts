import Redis from 'ioredis';
export declare const redisClient: Redis;
export declare function getRedisClient(): Redis;
export declare function closeRedisConnection(): Promise<void>;
