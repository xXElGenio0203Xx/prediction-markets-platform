// src/middleware/auth.ts
import { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { sign, verify } from '@fastify/jwt';
import { config } from '../config.js';
import { AppError } from '../utils/errors.js';
import { User } from '@prisma/client';
import bcrypt from 'bcrypt';

declare module 'fastify' {
  interface FastifyRequest {
    user?: User;
  }
}

export function generateTokens(userId: string) {
  const accessToken = sign(
    { userId, type: 'access' },
    config.JWT_SECRET,
    { expiresIn: config.JWT_ACCESS_EXPIRY }
  );

  const refreshToken = sign(
    { userId, type: 'refresh' },
    config.JWT_REFRESH_SECRET,
    { expiresIn: config.JWT_REFRESH_EXPIRY }
  );

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): { userId: string } {
  try {
    const payload = verify(token, config.JWT_SECRET) as { userId: string; type: string };
    if (payload.type !== 'access') {
      throw new Error('Invalid token type');
    }
    return { userId: payload.userId };
  } catch (error) {
    throw new AppError('INVALID_TOKEN', 401, 'Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): { userId: string } {
  try {
    const payload = verify(token, config.JWT_REFRESH_SECRET) as { userId: string; type: string };
    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return { userId: payload.userId };
  } catch (error) {
    throw new AppError('INVALID_TOKEN', 401, 'Invalid or expired refresh token');
  }
}

export const requireAuth: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  let token: string | undefined;

  // Check Authorization header
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // Check cookie
  if (!token && request.cookies.accessToken) {
    token = request.cookies.accessToken;
  }

  if (!token) {
    throw new AppError('UNAUTHORIZED', 401, 'Authentication required');
  }

  try {
    const { userId } = verifyAccessToken(token);
    const user = await request.server.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404, 'User not found');
    }

    request.user = user;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('UNAUTHORIZED', 401, 'Invalid authentication token');
  }
};

export const requireAdmin: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  if (!request.user) {
    throw new AppError('UNAUTHORIZED', 401, 'Authentication required');
  }

  if (request.user.role !== 'ADMIN') {
    throw new AppError('FORBIDDEN', 403, 'Admin access required');
  }
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePasswords(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
