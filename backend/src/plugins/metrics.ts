// src/plugins/metrics.ts
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

collectDefaultMetrics({ register });

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const orderPlacementTotal = new Counter({
  name: 'order_placement_total',
  help: 'Total number of orders placed',
  labelNames: ['market_id', 'side', 'type'],
  registers: [register],
});

export const tradeExecutionTotal = new Counter({
  name: 'trade_execution_total',
  help: 'Total number of trades executed',
  labelNames: ['market_id'],
  registers: [register],
});

export const wsConnectionsActive = new Gauge({
  name: 'ws_connections_active',
  help: 'Number of active WebSocket connections',
  registers: [register],
});

const metricsPlugin: FastifyPluginAsync = async (server) => {
  server.addHook('onRequest', async (request) => {
    request.startTime = Date.now();
  });

  server.addHook('onResponse', async (request, reply) => {
    if (request.startTime) {
      const duration = (Date.now() - request.startTime) / 1000;
      httpRequestDuration.observe(
        {
          method: request.method,
          route: request.routeOptions.url || request.url,
          status_code: reply.statusCode,
        },
        duration
      );
    }
  });

  server.get('/metrics', async (_request, reply) => {
    reply.header('Content-Type', register.contentType);
    return register.metrics();
  });

  server.log.info('Prometheus metrics available at /metrics');
};

declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
  }
}

export default fp(metricsPlugin, {
  name: 'metrics',
});
