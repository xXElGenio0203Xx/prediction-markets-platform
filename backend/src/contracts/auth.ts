// src/contracts/auth.ts
import { z } from 'zod';

export const zRegister = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().optional(),
});

export const zLogin = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const zUserResponse = z.object({
  id: z.string(),
  email: z.string(),
  role: z.enum(['USER', 'ADMIN']),
  fullName: z.string().nullable(),
  createdAt: z.date(),
});

export const zTokenResponse = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: zUserResponse,
});

export type RegisterInput = z.infer<typeof zRegister>;
export type LoginInput = z.infer<typeof zLogin>;
export type UserResponse = z.infer<typeof zUserResponse>;
export type TokenResponse = z.infer<typeof zTokenResponse>;
