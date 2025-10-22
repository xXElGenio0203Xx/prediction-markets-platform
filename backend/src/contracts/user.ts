// src/contracts/user.ts
import { z } from 'zod';

export const zBalanceResponse = z.object({
  available: z.string(),
  locked: z.string(),
  total: z.string(),
});

export const zPositionResponse = z.object({
  marketId: z.string(),
  market: z.object({
    slug: z.string(),
    question: z.string(),
  }),
  qtyLong: z.string(),
  qtyShort: z.string(),
  avgPrice: z.string(),
  realizedPnl: z.string(),
});

export const zTransferRequest = z.object({
  userId: z.string().uuid(),
  amount: z.string().regex(/^-?\d+\.?\d*$/),
  reason: z.string().min(1).max(200),
});

export const zPortfolioResponse = z.object({
  balance: zBalanceResponse,
  positions: z.array(zPositionResponse),
  totalValue: z.string(),
});

export type BalanceResponse = z.infer<typeof zBalanceResponse>;
export type PositionResponse = z.infer<typeof zPositionResponse>;
export type TransferRequest = z.infer<typeof zTransferRequest>;
export type PortfolioResponse = z.infer<typeof zPortfolioResponse>;
