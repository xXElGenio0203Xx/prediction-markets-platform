// src/plugins/redis.ts
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import Redis from 'ioredis';
import { config } from '../config.js';

const redisClient = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 3) {
      return null;
    }
    return Math.min(times * 1000, 3000);
  },
});

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}

const redisPlugin: FastifyPluginAsync = async (server) => {
  redisClient.on('connect', () => {
    server.log.info('Redis connected');
  });

  redisClient.on('error', (error) => {
    server.log.error(error, 'Redis error');
  });

  server.decorate('redis', redisClient);

  server.addHook('onClose', async (instance) => {
    instance.log.info('Disconnecting Redis');
    await redisClient.quit();
  });
};

export default fp(redisPlugin, {
  name: 'redis',
});
