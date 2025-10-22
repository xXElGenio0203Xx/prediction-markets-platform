import { FastifyPluginAsync } from 'fastify';
import { zLogin, zRegister, zUserResponse, zTokenResponse } from '../contracts/auth.js';
import { validateBody } from '../utils/validate.js';
import { AppError } from '../utils/errors.js';
import { hashPassword, comparePasswords, generateTokens, verifyRefreshToken } from '../middleware/auth.js';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Register new user
  fastify.post(
    '/register',
    {
      schema: {
        description: 'Register a new user account',
        tags: ['auth'],
        body: zRegister,
        response: {
          201: zUserResponse,
        },
      },
      preHandler: validateBody(zRegister),
    },
    async (request, reply) => {
      const { email, password, fullName } = request.body;

      // Check if user already exists
      const existingUser = await fastify.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new AppError('USER_EXISTS', 'Email already registered', 409);
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user with initial balance
      const user = await fastify.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email,
            passwordHash,
            fullName,
            role: 'USER',
          },
        });

        // Create initial balance
        await tx.balance.create({
          data: {
            userId: newUser.id,
            available: 10000, // $10,000 starting balance
            locked: 0,
            total: 10000,
          },
        });

        return newUser;
      });

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user);

      // Store refresh token in database
      await fastify.prisma.session.create({
        data: {
          userId: user.id,
          refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          userAgent: request.headers['user-agent'] || 'unknown',
          ipAddress: request.ip,
        },
      });

      // Set HTTP-only cookie
      reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: fastify.config.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
        path: '/',
      });

      reply.code(201).send({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        accessToken,
      });
    }
  );

  // Login
  fastify.post(
    '/login',
    {
      schema: {
        description: 'Login with email and password',
        tags: ['auth'],
        body: zLogin,
        response: {
          200: zUserResponse,
        },
      },
      preHandler: validateBody(zLogin),
    },
    async (request, reply) => {
      const { email, password } = request.body;

      // Find user
      const user = await fastify.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
      }

      // Verify password
      const isValid = await comparePasswords(password, user.passwordHash);
      if (!isValid) {
        throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
      }

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user);

      // Store refresh token
      await fastify.prisma.session.create({
        data: {
          userId: user.id,
          refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userAgent: request.headers['user-agent'] || 'unknown',
          ipAddress: request.ip,
        },
      });

      // Set HTTP-only cookie
      reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: fastify.config.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });

      reply.send({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        accessToken,
      });
    }
  );

  // Refresh access token
  fastify.post(
    '/refresh',
    {
      schema: {
        description: 'Refresh access token using refresh token',
        tags: ['auth'],
        response: {
          200: zTokenResponse,
        },
      },
    },
    async (request, reply) => {
      const refreshToken = request.cookies.refreshToken;

      if (!refreshToken) {
        throw new AppError('NO_REFRESH_TOKEN', 'No refresh token provided', 401);
      }

      // Verify refresh token
      const payload = verifyRefreshToken(refreshToken);

      // Check if session exists and is valid
      const session = await fastify.prisma.session.findFirst({
        where: {
          refreshToken,
          userId: payload.sub,
          expiresAt: { gt: new Date() },
        },
        include: {
          user: true,
        },
      });

      if (!session) {
        throw new AppError('INVALID_SESSION', 'Invalid or expired session', 401);
      }

      // Generate new tokens
      const tokens = generateTokens(session.user);

      // Update session with new refresh token
      await fastify.prisma.session.update({
        where: { id: session.id },
        data: {
          refreshToken: tokens.refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // Update cookie
      reply.setCookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: fastify.config.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });

      reply.send({
        accessToken: tokens.accessToken,
      });
    }
  );

  // Logout
  fastify.post(
    '/logout',
    {
      schema: {
        description: 'Logout and invalidate refresh token',
        tags: ['auth'],
        response: {
          204: { type: 'null' },
        },
      },
    },
    async (request, reply) => {
      const refreshToken = request.cookies.refreshToken;

      if (refreshToken) {
        // Delete session from database
        await fastify.prisma.session.deleteMany({
          where: { refreshToken },
        });
      }

      // Clear cookie
      reply.clearCookie('refreshToken', { path: '/' });
      reply.code(204).send();
    }
  );

  // Get current user
  fastify.get(
    '/me',
    {
      schema: {
        description: 'Get current authenticated user',
        tags: ['auth'],
        response: {
          200: zUserResponse,
        },
      },
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const user = await fastify.prisma.user.findUnique({
        where: { id: request.user.sub },
      });

      if (!user) {
        throw new AppError('USER_NOT_FOUND', 'User not found', 404);
      }

      reply.send({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      });
    }
  );
};

export default authRoutes;
