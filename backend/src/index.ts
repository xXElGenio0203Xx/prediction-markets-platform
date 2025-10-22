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

// Import routes
import authRoutes from './routes/auth.js';
import marketsRoutes from './routes/markets.js';
import ordersRoutes from './routes/orders.js';
import userRoutes from './routes/user.js';

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

// Decorate fastify with auth functions
fastify.decorate('authenticate', requireAuth);
fastify.decorate('requireAdmin', requireAdmin);

// Health check
fastify.get('/healthz', async (request, reply) => {
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

// Start server
try {
  const address = await fastify.listen({
    port: config.PORT,
    host: '0.0.0.0',
  });

  fastify.log.info(`🚀 Server listening on ${address}`);
  fastify.log.info(`📚 Swagger docs: ${address}/docs`);
  fastify.log.info(`📊 Metrics: ${address}/metrics`);

  // Initialize WebSocket server
  const wsServer = new WebSocketServer(fastify.server, fastify.log, config.CORS_ORIGIN);
  fastify.decorate('websocketServer', wsServer);
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
