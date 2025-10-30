import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform((v) => parseInt(v, 10)).default('4000'),
  CORS_ORIGIN: z.string().url(),
  
  // Supabase
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  
  // Database
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  
  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  
  // Rate Limiting
  RATE_LIMIT_MAX: z.string().transform((v) => parseInt(v, 10)).default('100'),
  RATE_LIMIT_WINDOW: z.string().default('15m'),
  
  // WebSocket
  WS_HEARTBEAT_INTERVAL: z.string().transform((v) => parseInt(v, 10)).default('15000'),
  WS_IDLE_TIMEOUT: z.string().transform((v) => parseInt(v, 10)).default('60000'),
  
  // Matching Engine
  MAX_PRICE_SLIPPAGE: z.string().transform((v) => parseFloat(v)).default('0.10'),
  PRICE_SCALE: z.string().transform((v) => parseInt(v, 10)).default('4'),
  SELF_TRADE_PREVENTION: z.string().transform((v) => v === 'true').default('true'),
  
  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Config = z.infer<typeof configSchema>;

function validateConfig(): Config {
  try {
    return configSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((e) => e.path.join('.')).join(', ');
      throw new Error(`Invalid configuration. Missing/invalid: ${missingVars}`);
    }
    throw error;
  }
}

export const config = validateConfig();
