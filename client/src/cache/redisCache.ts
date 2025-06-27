// src/cache/redisCache.ts
import Redis from 'ioredis';
import Logger from '../utils/logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl);

export async function getCached(key: string, fallbackFn: () => Promise<any>, ttlSeconds = 3600): Promise<any> {
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);
    const value = await fallbackFn();
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    return value;
  } catch (error) {
    Logger.error('Redis cache error', error, { key });
    return fallbackFn();
  }
}

export default redis;
