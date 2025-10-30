// src/contracts/markets.ts
import { z } from 'zod';

export const zCreateMarket = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  question: z.string().min(10).max(500),
  description: z.string().max(2000).optional(),
});

export const zMarketResponse = z.object({
  id: z.string(),
  slug: z.string(),
  question: z.string(),
  description: z.string().nullable(),
  status: z.enum(['DRAFT', 'OPEN', 'RESOLVED', 'CANCELED']),
  createdAt: z.date(),
  updatedAt: z.date(),
  creator: z.object({
    id: z.string(),
    email: z.string(),
    fullName: z.string().nullable(),
  }),
});

export const zListMarketsQuery = z.object({
  status: z.enum(['DRAFT', 'OPEN', 'RESOLVED', 'CANCELED']).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const zUpdateMarketStatus = z.object({
  status: z.enum(['DRAFT', 'OPEN', 'RESOLVED', 'CANCELED']),
  resolutionText: z.string().optional(),
});

export type CreateMarketInput = z.infer<typeof zCreateMarket>;
export type MarketResponse = z.infer<typeof zMarketResponse>;
export type ListMarketsQuery = z.infer<typeof zListMarketsQuery>;
export type UpdateMarketStatusInput = z.infer<typeof zUpdateMarketStatus>;
