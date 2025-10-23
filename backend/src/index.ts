import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import { config } from './config.js';
import prismaPlugin from './plugins/prisma.js';
import redisPlugin from './plugins/redis.js';
import swaggerPlugin from './plugins/swagger.js';
import metricsPlugin from './plugins/metrics.js';
import { errorHandler } from './utils/errors.js';
import { requireAuth, requireAdmin } from './middleware/auth.js';
import { WebSocketServer } from './websocket/server.js';
import { MatchingEngine } from './engine/engine.js';
import type { Redis } from 'ioredis';

// Import routes
import authRoutes from './routes/auth-simple.js';
import marketsRoutes from './routes/markets-simple.js';
import ordersRoutes from './routes/orders.js';
import userRoutes from './routes/user.js';
import adminRoutes from './routes/admin.js';
import analyticsRoutes from './routes/analytics.js';

// Extend Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
    config: typeof config;
    authenticate: typeof requireAuth;
    requireAdmin: typeof requireAdmin;
    websocketServer: WebSocketServer;
    matchingEngine: MatchingEngine;
  }
}

const fastify = Fastify({
  logger: {
    level: config.LOG_LEVEL,
    transport:
      config.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  },
});

// Security plugins
await fastify.register(fastifyHelmet, {
  contentSecurityPolicy: config.NODE_ENV === 'production',
});

await fastify.register(fastifyCors, {
  origin: config.CORS_ORIGIN,
  credentials: true,
});

await fastify.register(fastifyRateLimit, {
  max: config.RATE_LIMIT_MAX,
  timeWindow: config.RATE_LIMIT_WINDOW,
});

await fastify.register(fastifyCookie, {
  secret: config.JWT_SECRET,
});

// Core plugins
await fastify.register(prismaPlugin);
await fastify.register(redisPlugin);
await fastify.register(swaggerPlugin);
await fastify.register(metricsPlugin);

// Register error handler
fastify.setErrorHandler(errorHandler);

// Decorate fastify with auth functions and config
fastify.decorate('authenticate', requireAuth);
fastify.decorate('requireAdmin', requireAdmin);
fastify.decorate('config', config);

// Initialize matching engine
const matchingEngine = new MatchingEngine(fastify.prisma, fastify.log);
fastify.decorate('matchingEngine', matchingEngine);

// Health check
fastify.get('/healthz', async (_request, reply) => {
  try {
    await fastify.prisma.$queryRaw`SELECT 1`;
    await fastify.redis.ping();
    return {
      status: 'healthy',
      timestamp: Date.now(),
      uptime: process.uptime(),
      database: 'connected',
      redis: 'connected',
    };
  } catch (error) {
    reply.code(503);
    return {
      status: 'unhealthy',
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

// Register routes
await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(marketsRoutes, { prefix: '/api/markets' });
await fastify.register(ordersRoutes, { prefix: '/api/orders' });
await fastify.register(userRoutes, { prefix: '/api/user' });
await fastify.register(adminRoutes, { prefix: '/api/admin' });
await fastify.register(analyticsRoutes, { prefix: '/api/analytics' });

// Initialize WebSocket server BEFORE listening
const wsServer = new WebSocketServer(fastify.server, fastify.log, config.CORS_ORIGIN);
fastify.decorate('websocketServer', wsServer);

// Start server
try {
  const address = await fastify.listen({
    port: config.PORT,
    host: '0.0.0.0',
  });

  fastify.log.info(`🚀 Server listening on ${address}`);
  fastify.log.info(`📚 Swagger docs: ${address}/docs`);
  fastify.log.info(`📊 Metrics: ${address}/metrics`);
  fastify.log.info(`🔌 WebSocket server initialized`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}

// Graceful shutdown
const signals = ['SIGINT', 'SIGTERM'] as const;
signals.forEach((signal) => {
  process.on(signal, async () => {
    fastify.log.info(`Received ${signal}, starting graceful shutdown`);
    try {
      const wsServer = (fastify as any).websocketServer as WebSocketServer;
      if (wsServer) {
        wsServer.close();
      }
      await fastify.close();
      await fastify.prisma.$disconnect();
      await fastify.redis.quit();
      fastify.log.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      fastify.log.error(error, 'Error during shutdown');
      process.exit(1);
    }
  });
});
