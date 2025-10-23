import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { config } from '../config.js';

export function initSentry(): void {
  if (!config.SENTRY_DSN) {
    console.log('[Sentry] DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: config.SENTRY_DSN,
    environment: config.NODE_ENV,
    integrations: [
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: config.isProd ? 0.1 : 1.0,
    profilesSampleRate: config.isProd ? 0.1 : 1.0,
  });

  console.log('[Sentry] Initialized');
}

export { Sentry };
