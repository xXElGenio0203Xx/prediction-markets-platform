import { FastifyRequest, preHandlerHookHandler } from 'fastify';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { config } from '../config.js';
import { AppError } from '../utils/errors.js';
import { prisma } from '../lib/prisma.js';
import type { User } from '@prediction-markets/shared';

declare module 'fastify' {
  interface FastifyRequest {
    user?: User;
  }
}

export function generateTokens(userId: string, email: string, role: string) {
  const accessToken = jwt.sign(
    { sub: userId, email, role, type: 'access' },
    config.JWT_SECRET,
    { expiresIn: config.JWT_ACCESS_EXPIRY } as jwt.SignOptions
  );

  const refreshToken = jwt.sign(
    { sub: userId, type: 'refresh' },
    config.JWT_REFRESH_SECRET || config.JWT_SECRET,
    { expiresIn: config.JWT_REFRESH_EXPIRY } as jwt.SignOptions
  );

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): { sub: string; email: string; role: string } {
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as { sub: string; email: string; role: string; type: string };
    if (payload.type !== 'access') {
      throw new Error('Invalid token type');
    }
    return { sub: payload.sub, email: payload.email, role: payload.role };
  } catch (error) {
    throw new AppError('INVALID_TOKEN', 401, 'Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): { sub: string } {
  try {
    const secret = config.JWT_REFRESH_SECRET || config.JWT_SECRET;
    const payload = jwt.verify(token, secret) as { sub: string; type: string };
    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return { sub: payload.sub };
  } catch (error) {
    throw new AppError('INVALID_TOKEN', 401, 'Invalid or expired refresh token');
  }
}

export const requireAuth: preHandlerHookHandler = async (
  request: FastifyRequest
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
    const { sub } = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: sub },
    });

    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404, 'User not found');
    }

    request.user = {
      id: user.id,
      email: user.email,
      handle: user.handle || undefined,
      fullName: user.fullName,
      role: user.role as 'USER' | 'ADMIN',
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('UNAUTHORIZED', 401, 'Invalid authentication token');
  }
};

export const requireAdmin: preHandlerHookHandler = async (
  request: FastifyRequest
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
