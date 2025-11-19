import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('8080'),
  
  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  
  // Redis
  REDIS_URL: z.string().url(),
  
  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  
  // WebSocket
  WS_HEARTBEAT_INTERVAL: z.string().transform(Number).default('25000'),
  WS_IDLE_TIMEOUT: z.string().transform(Number).default('30000'),
  
  // Rate Limiting
  RATE_LIMIT_MAX: z.string().transform(Number).default('100'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('60000'),
  WS_RATE_LIMIT_MAX: z.string().transform(Number).default('10'),
  WS_RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('60000'),
  
  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  
  // Optional Services
  SENTRY_DSN: z.string().url().optional(),
  RESEND_API_KEY: z.string().optional(),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  try {
    return configSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      throw new Error(`Configuration validation failed:\n${missingVars.join('\n')}`);
    }
    throw error;
  }
}

export const config = loadConfig();

// Export individual values for convenience
export const {
  NODE_ENV,
  PORT,
  DATABASE_URL,
  DIRECT_URL,
  REDIS_URL,
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
  CORS_ORIGIN,
  WS_HEARTBEAT_INTERVAL,
  WS_IDLE_TIMEOUT,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  WS_RATE_LIMIT_MAX,
  WS_RATE_LIMIT_WINDOW_MS,
  LOG_LEVEL,
  SENTRY_DSN,
  RESEND_API_KEY,
} = config;

export const isProd = NODE_ENV === 'production';
export const isDev = NODE_ENV === 'development';
export const isTest = NODE_ENV === 'test';
