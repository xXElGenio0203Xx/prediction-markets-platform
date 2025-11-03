import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyJwt from '@fastify/jwt';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { config } from './config.js';
import { redis, subscriber, CHANNELS } from './lib/redis.js';
import { limiter, wsLimiter } from './lib/rate-limit.js';
import { prisma } from './lib/prisma.js';
import { initSentry } from './lib/sentry.js';
import { registerMetrics } from './lib/metrics.js';
import type { User } from '@prediction-markets/shared';

// ============================================================================
// Initialize Sentry (optional)
// ============================================================================

if (config.SENTRY_DSN) {
  initSentry();
}

// ============================================================================
// Create Fastify Instance
// ============================================================================

const app = Fastify({
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
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'reqId',
});

// ============================================================================
// Register Plugins
// ============================================================================

// Helmet for security headers
await app.register(fastifyHelmet, {
  contentSecurityPolicy: config.NODE_ENV === 'production',
  crossOriginEmbedderPolicy: false,
});

// CORS
const corsOrigins = config.CORS_ORIGIN.split(',').map(o => o.trim());
await app.register(fastifyCors, {
  origin: corsOrigins.length === 1 && corsOrigins[0] === '*' ? true : corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-ID'],
});

// JWT
await app.register(fastifyJwt, {
  secret: config.JWT_SECRET,
  cookie: {
    cookieName: 'refreshToken',
    signed: false,
  },
});

// Cookies
await app.register(fastifyCookie, {
  secret: config.JWT_SECRET,
});

// ============================================================================
// Extend Fastify Types
// ============================================================================

declare module 'fastify' {
  interface FastifyRequest {
    user?: User;
  }
}

// ============================================================================
// Rate Limiting Middleware
// ============================================================================

app.addHook('preHandler', async (request, reply) => {
  const key = (request.headers['x-forwarded-for'] as string) ?? request.ip;
  
  try {
    await limiter.consume(key);
  } catch (error) {
    app.log.warn({ key, path: request.url }, 'Rate limit exceeded');
    return reply.code(429).send({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
    });
  }
});

// ============================================================================
// Health & Readiness Endpoints
// ============================================================================

app.get('/health', async () => {
  return { ok: true, timestamp: new Date().toISOString() };
});

app.get('/ready', async (request, reply) => {
  try {
    await Promise.all([
      prisma.$queryRaw`SELECT 1`,
      redis.ping(),
    ]);
    return { ready: true, database: 'connected', redis: 'connected' };
  } catch (error) {
    app.log.error(error, 'Readiness check failed');
    return reply.code(503).send({
      ready: false,
      error: 'Service dependencies unavailable',
    });
  }
});

// ============================================================================
// Metrics Endpoint
// ============================================================================

registerMetrics(app);

// ============================================================================
// Register Routes
// ============================================================================

// Import routes dynamically after app is configured
const registerRoutes = async () => {
  const authRoutes = await import('./routes/auth.js');
  const marketsRoutes = await import('./routes/markets.js');
  const ordersRoutes = await import('./routes/orders.js');
  const userRoutes = await import('./routes/user.js');
  const adminRoutes = await import('./routes/admin.js');
  const analyticsRoutes = await import('./routes/analytics.js');

  await app.register(authRoutes.default, { prefix: '/api/auth' });
  await app.register(marketsRoutes.default, { prefix: '/api/markets' });
  await app.register(ordersRoutes.default, { prefix: '/api/orders' });
  await app.register(userRoutes.default, { prefix: '/api/user' });
  await app.register(adminRoutes.default, { prefix: '/api/admin' });
  await app.register(analyticsRoutes.default, { prefix: '/api/analytics' });
};

await registerRoutes();

// ============================================================================
// Socket.IO Server
// ============================================================================

const httpServer = app.server;

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: corsOrigins.length === 1 && corsOrigins[0] === '*' ? true : corsOrigins,
    credentials: true,
  },
  path: '/ws',
  transports: ['websocket', 'polling'],
  pingInterval: config.WS_HEARTBEAT_INTERVAL,
  pingTimeout: config.WS_IDLE_TIMEOUT,
});

// WebSocket authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    // Rate limit WebSocket connections
    const key = socket.handshake.address;
    try {
      await wsLimiter.consume(key);
    } catch {
      return next(new Error('Too many connection attempts'));
    }

    // Verify JWT
    const decoded = app.jwt.verify(token) as { sub: string; email: string; role: string };
    
    // Fetch user
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user) {
      return next(new Error('User not found'));
    }

    socket.data.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    next();
  } catch (error) {
    next(new Error('Invalid authentication token'));
  }
});

// WebSocket connection handler
io.on('connection', (socket) => {
  const user = socket.data.user;
  
  app.log.info({ userId: user.id, socketId: socket.id }, 'WebSocket client connected');

  // Subscribe to market orderbook
  socket.on('subscribe:market', (marketId: string) => {
    socket.join(`m:${marketId}`);
    socket.join(`m:${marketId}:YES`);
    socket.join(`m:${marketId}:NO`);
    app.log.debug({ userId: user.id, marketId }, 'Subscribed to market');
  });

  // Unsubscribe from market
  socket.on('unsubscribe:market', (marketId: string) => {
    socket.leave(`m:${marketId}`);
    socket.leave(`m:${marketId}:YES`);
    socket.leave(`m:${marketId}:NO`);
    app.log.debug({ userId: user.id, marketId }, 'Unsubscribed from market');
  });

  // Subscribe to user-specific events
  socket.join(`u:${user.id}`);

  // Heartbeat
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });

  socket.on('disconnect', (reason) => {
    app.log.info({ userId: user.id, socketId: socket.id, reason }, 'WebSocket client disconnected');
  });
});

// Redis pub/sub → Socket.IO bridge
subscriber.subscribe(CHANNELS.ORDERBOOK, (message) => {
  try {
    const data = JSON.parse(message);
    io.to(`m:${data.marketId}:${data.outcome}`).emit('orderbook_update', data);
  } catch (error) {
    app.log.error(error, 'Failed to parse orderbook message');
  }
});

subscriber.subscribe(CHANNELS.TRADES, (message) => {
  try {
    const data = JSON.parse(message);
    io.to(`m:${data.marketId}`).emit('trade_executed', data);
  } catch (error) {
    app.log.error(error, 'Failed to parse trade message');
  }
});

subscriber.subscribe(CHANNELS.MARKETS, (message) => {
  try {
    const data = JSON.parse(message);
    io.to(`m:${data.marketId}`).emit('market_updated', data);
  } catch (error) {
    app.log.error(error, 'Failed to parse market message');
  }
});

// Store io instance for use in routes
app.decorate('io', io);

declare module 'fastify' {
  interface FastifyInstance {
    io: SocketIOServer;
  }
}

// ============================================================================
// Error Handler
// ============================================================================

app.setErrorHandler((error, request, reply) => {
  app.log.error({ err: error, reqId: request.id, path: request.url }, 'Request error');

  if (error.validation) {
    return reply.code(400).send({
      statusCode: 400,
      error: 'Validation Error',
      message: error.message,
      details: error.validation,
    });
  }

  const statusCode = error.statusCode ?? 500;
  reply.code(statusCode).send({
    statusCode,
    error: error.name ?? 'Internal Server Error',
    message: config.NODE_ENV === 'production' && statusCode === 500 
      ? 'An unexpected error occurred' 
      : error.message,
  });
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

const gracefulShutdown = async () => {
  app.log.info('Received shutdown signal, closing server gracefully...');
  
  try {
    await Promise.all([
      new Promise((resolve) => io.close(() => resolve(true))),
      app.close(),
      prisma.$disconnect(),
      redis.quit(),
      subscriber.quit(),
    ]);
    
    app.log.info('Server closed gracefully');
    process.exit(0);
  } catch (error) {
    app.log.error(error, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// ============================================================================
// Start Server
// ============================================================================

const start = async () => {
  try {
    const port = config.PORT;
    const host = '0.0.0.0';

    await app.ready();
    
    httpServer.listen(port, host, (err) => {
      if (err) {
        app.log.error(err);
        process.exit(1);
      }
      
      app.log.info(`🚀 HTTP server listening on ${host}:${port}`);
      app.log.info(`📡 WebSocket server ready at /ws`);
      app.log.info(`💚 Health check available at /health`);
      app.log.info(`📊 Metrics available at /metrics`);
      app.log.info(`🌍 Environment: ${config.NODE_ENV}`);
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
