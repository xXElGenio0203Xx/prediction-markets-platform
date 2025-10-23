import { RateLimiterRedis } from 'rate-limiter-flexible';
import { redis } from './redis.js';
import { config } from '../config.js';

// HTTP rate limiter (per IP)
export const limiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:http',
  points: config.RATE_LIMIT_MAX, // Number of requests
  duration: config.RATE_LIMIT_WINDOW_MS / 1000, // Per window in seconds
  blockDuration: 60, // Block for 60s if exceeded
});

// WebSocket rate limiter (per IP for connection attempts)
export const wsLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:ws',
  points: config.WS_RATE_LIMIT_MAX, // Number of connections/auth attempts
  duration: config.WS_RATE_LIMIT_WINDOW_MS / 1000,
  blockDuration: 60,
});

// Helper to get rate limit headers
export function getRateLimitHeaders(result: { remainingPoints: number; msBeforeNext: number }) {
  return {
    'X-RateLimit-Limit': config.RATE_LIMIT_MAX.toString(),
    'X-RateLimit-Remaining': Math.max(0, result.remainingPoints).toString(),
    'X-RateLimit-Reset': new Date(Date.now() + result.msBeforeNext).toISOString(),
  };
}
