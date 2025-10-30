import { register, Counter, Histogram, Gauge } from 'prom-client';

// HTTP request metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// WebSocket metrics
export const wsConnectionsTotal = new Gauge({
  name: 'websocket_connections_total',
  help: 'Total number of WebSocket connections',
});

export const wsMessagesTotal = new Counter({
  name: 'websocket_messages_total',
  help: 'Total number of WebSocket messages',
  labelNames: ['event'],
});

// Business metrics
export const ordersPlacedTotal = new Counter({
  name: 'orders_placed_total',
  help: 'Total number of orders placed',
  labelNames: ['market_id', 'side', 'outcome'],
});

export const tradesExecutedTotal = new Counter({
  name: 'trades_executed_total',
  help: 'Total number of trades executed',
  labelNames: ['market_id'],
});

export const orderMatchingDuration = new Histogram({
  name: 'order_matching_duration_seconds',
  help: 'Order matching engine duration in seconds',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

// Database metrics
export const databaseQueryDuration = new Histogram({
  name: 'database_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.01, 0.1, 0.5, 1, 2],
});

// Export Prometheus registry
export { register };
