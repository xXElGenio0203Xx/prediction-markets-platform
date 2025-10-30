// src/contracts/index.ts
import { z } from 'zod';

export const zMessageEnvelope = z.object({
  type: z.string(),
  ts: z.number(),
  seq: z.number().optional(),
  lastSeq: z.number().optional(),
  data: z.unknown(),
  requestId: z.string().optional(),
});

export type MessageEnvelope<T = unknown> = {
  type: string;
  ts: number;
  seq?: number;
  lastSeq?: number;
  data: T;
  requestId?: string;
};
