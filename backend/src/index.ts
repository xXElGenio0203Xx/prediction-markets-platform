// src/index.ts
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
import authRoutes from './routes/auth.js';
import marketRoutes from './routes/markets.js';
import orderRoutes from './routes/orders.js';
import userRoutes from './routes/user.js';
import { initWebSocketServer } from './ws/server.js';
import { errorHandler } from './utils/errors.js';

const server = Fastify({
  logger: {
    level: config.LOG_LEVEL,
    transport: config.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
  },
  requestIdLogLabel: 'requestId',
  genReqId: () => crypto.randomUUID(),
});

async function start() {
  try {
    // Security plugins
    await server.register(fastifyHelmet, {
      contentSecurityPolicy: config.NODE_ENV === 'production',
    });

    await server.register(fastifyCors, {
      origin: config.CORS_ORIGIN,
      credentials: true,
    });

    await server.register(fastifyCookie, {
      secret: config.JWT_SECRET,
    });

    await server.register(fastifyRateLimit, {
      global: true,
      max: config.RATE_LIMIT_MAX,
      timeWindow: config.RATE_LIMIT_WINDOW,
    });

    // Custom plugins
    await server.register(prismaPlugin);
    await server.register(redisPlugin);
    await server.register(metricsPlugin);
    await server.register(swaggerPlugin);

    // Error handler
    server.setErrorHandler(errorHandler);

    // Health check
    server.get('/healthz', async (request, reply) => {
      try {
        await server.prisma.$queryRaw`SELECT 1`;
        await server.redis.ping();
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
    await server.register(authRoutes, { prefix: '/v1/auth' });
    await server.register(marketRoutes, { prefix: '/v1/markets' });
    await server.register(orderRoutes, { prefix: '/v1' });
    await server.register(userRoutes, { prefix: '/v1/user' });

    // Initialize WebSocket server
    const io = initWebSocketServer(server.server);

    // Graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'] as const;
    signals.forEach((signal) => {
      process.on(signal, async () => {
        server.log.info(`Received ${signal}, starting graceful shutdown`);
        try {
          io.close();
          await server.close();
          await server.prisma.$disconnect();
          await server.redis.quit();
          server.log.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          server.log.error(error, 'Error during shutdown');
          process.exit(1);
        }
      });
    });

    await server.listen({ port: config.PORT, host: '0.0.0.0' });
    server.log.info(`Server listening on port ${config.PORT}`);
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

start();
