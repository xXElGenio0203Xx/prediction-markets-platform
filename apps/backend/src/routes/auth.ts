import { FastifyPluginAsync } from 'fastify';
import { hashPassword, comparePasswords, generateTokens, verifyRefreshToken, requireAuth } from '../middleware/auth.js';
import { AppError } from '../utils/errors.js';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Register
  fastify.post('/register', async (request, reply) => {
    const { email, password, fullName, handle } = request.body as any;

    // Validate input
    if (!email || !password) {
      throw new AppError('INVALID_INPUT', 400, 'Email and password are required');
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError('USER_EXISTS', 409, 'User already exists');
    }

    // Check if handle is taken (if provided)
    if (handle) {
      const existingHandle = await prisma.user.findUnique({ where: { handle } });
      if (existingHandle) {
        throw new AppError('HANDLE_TAKEN', 409, 'Handle already taken');
      }
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.$transaction(async (tx: any) => {
      const newUser = await tx.user.create({
        data: { 
          email, 
          passwordHash, 
          fullName: fullName || null, 
          handle: handle || null,
          role: 'USER' 
        },
      });

      // Create initial balance
      await tx.balance.create({
        data: { userId: newUser.id, available: 100, locked: 0, total: 100 },
      });

      return newUser;
    });

    const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: request.headers['user-agent'] || 'unknown',
        ipAddress: request.ip,
      },
    });

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    reply.code(201).send({
      user: {
        id: user.id,
        email: user.email,
        handle: user.handle,
        fullName: user.fullName,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      accessToken,
    });
  });

  // Login
  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body as any;

    if (!email || !password) {
      throw new AppError('INVALID_INPUT', 400, 'Email and password are required');
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await comparePasswords(password, user.passwordHash))) {
      throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid credentials');
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: request.headers['user-agent'] || 'unknown',
        ipAddress: request.ip,
      },
    });

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    reply.send({
      user: {
        id: user.id,
        email: user.email,
        handle: user.handle,
        fullName: user.fullName,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      accessToken,
    });
  });

  // Refresh
  fastify.post('/refresh', async (request, reply) => {
    const refreshToken = request.cookies.refreshToken;
    if (!refreshToken) {
      throw new AppError('NO_REFRESH_TOKEN', 401, 'No refresh token');
    }

    const decoded = verifyRefreshToken(refreshToken);
    const session = await prisma.session.findFirst({
      where: { userId: decoded.sub, refreshToken, expiresAt: { gte: new Date() } },
      include: { user: true },
    });

    if (!session) {
      throw new AppError('INVALID_SESSION', 401, 'Invalid session');
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      session.user.id,
      session.user.email,
      session.user.role
    );

    await prisma.session.update({
      where: { id: session.id },
      data: { refreshToken: newRefreshToken },
    });

    reply.setCookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    reply.send({ accessToken });
  });

  // Logout
  fastify.post('/logout', async (request, reply) => {
    const refreshToken = request.cookies.refreshToken;
    if (refreshToken) {
      await prisma.session.deleteMany({ where: { refreshToken } });
    }

    reply.clearCookie('refreshToken', { path: '/' });
    reply.send({ message: 'Logged out' });
  });

  // Me
  fastify.get('/me', { preHandler: [requireAuth] }, async (request) => {
    const user = request.user!;
    const balance = await prisma.balance.findUnique({ where: { userId: user.id } });

    return {
      id: user.id,
      email: user.email,
      handle: user.handle,
      fullName: user.fullName,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      balance: balance ? {
        available: Number(balance.available),
        locked: Number(balance.locked),
        total: Number(balance.total),
      } : null,
    };
  });
};

export default authRoutes;
