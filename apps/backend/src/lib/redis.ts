import Redis from 'ioredis';
import { config } from '../config.js';

export const CHANNELS = {
  ORDERBOOK: 'pm:orderbook',
  TRADES: 'pm:trades',
  MARKETS: 'pm:markets',
} as const;

// Main Redis client for caching, pub/sub, etc.
export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError(err) {
    const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
    if (targetErrors.some(e => err.message.includes(e))) {
      return true; // Reconnect
    }
    return false;
  },
});

// Subscriber client (Redis pub/sub requires dedicated connection)
export const subscriber = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// Publisher client (separate for clarity, can reuse main client too)
export const publisher = redis;

// Error handling
redis.on('error', (err) => {
  console.error('[Redis] Client error:', err);
});

subscriber.on('error', (err) => {
  console.error('[Redis] Subscriber error:', err);
});

redis.on('connect', () => {
  console.log('[Redis] Connected');
});

subscriber.on('connect', () => {
  console.log('[Redis] Subscriber connected');
});

// Health check helper
export async function checkRedisHealth(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

// Graceful shutdown
export async function closeRedis(): Promise<void> {
  await Promise.all([
    redis.quit(),
    subscriber.quit(),
  ]);
  console.log('[Redis] Connections closed');
}
