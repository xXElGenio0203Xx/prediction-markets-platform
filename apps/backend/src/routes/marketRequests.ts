import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { AppError } from '../utils/errors.js';
import { prisma } from '../lib/prisma.js';

const CreateMarketRequestSchema = z.object({
  title: z.string().min(10).max(200),
  description: z.string().optional(),
  category: z.string(),
  resolutionCriteria: z.string().min(20),
  suggestedCloseDate: z.string().optional(),
});

const ReviewMarketRequestSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  adminNotes: z.string().optional(),
});

const marketRequestsRoutes: FastifyPluginAsync = async (fastify) => {
  // Submit a market request (any authenticated user)
  fastify.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const data = CreateMarketRequestSchema.parse(request.body);
    const userId = request.user!.id;
    const userEmail = request.user!.email;

    const marketRequest = await prisma.marketRequest.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        resolutionCriteria: data.resolutionCriteria,
        suggestedCloseDate: data.suggestedCloseDate ? new Date(data.suggestedCloseDate) : null,
        requestedBy: userId,
        requesterEmail: userEmail,
        status: 'PENDING',
      },
    });

    fastify.log.info({ marketRequestId: marketRequest.id, userId }, 'Market request created');

    return {
      success: true,
      marketRequest: {
        id: marketRequest.id,
        title: marketRequest.title,
        status: marketRequest.status,
        createdAt: marketRequest.createdAt,
      },
    };
  });

  // Get all market requests (admin only)
  fastify.get('/admin/all', { preHandler: [requireAuth, requireAdmin] }, async (request) => {
    const { status, page = 1, pageSize = 20 } = request.query as any;

    const where: any = {};
    if (status) where.status = status;

    const [requests, total] = await Promise.all([
      prisma.marketRequest.findMany({
        where,
        include: {
          reviewer: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
          createdMarket: {
            select: {
              id: true,
              slug: true,
              question: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
      prisma.marketRequest.count({ where }),
    ]);

    return {
      requests,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        totalPages: Math.ceil(total / Number(pageSize)),
      },
    };
  });

  // Get single market request details (admin only)
  fastify.get('/admin/:id', { preHandler: [requireAuth, requireAdmin] }, async (request) => {
    const { id } = request.params as { id: string };

    const marketRequest = await prisma.marketRequest.findUnique({
      where: { id },
      include: {
        reviewer: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        createdMarket: {
          select: {
            id: true,
            slug: true,
            question: true,
            status: true,
          },
        },
      },
    });

    if (!marketRequest) {
      throw new AppError('REQUEST_NOT_FOUND', 404, 'Market request not found');
    }

    return { marketRequest };
  });

  // Review a market request (admin only)
  fastify.patch('/admin/:id/review', { preHandler: [requireAuth, requireAdmin] }, async (request) => {
    const { id } = request.params as { id: string };
    const data = ReviewMarketRequestSchema.parse(request.body);
    const adminId = request.user!.id;

    const marketRequest = await prisma.marketRequest.findUnique({
      where: { id },
    });

    if (!marketRequest) {
      throw new AppError('REQUEST_NOT_FOUND', 404, 'Market request not found');
    }

    if (marketRequest.status !== 'PENDING') {
      throw new AppError('ALREADY_REVIEWED', 400, 'Market request has already been reviewed');
    }

    const updated = await prisma.marketRequest.update({
      where: { id },
      data: {
        status: data.status,
        adminNotes: data.adminNotes,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
      include: {
        reviewer: {
          select: {
            email: true,
            fullName: true,
          },
        },
      },
    });

    fastify.log.info(
      { marketRequestId: id, status: data.status, adminId },
      'Market request reviewed'
    );

    return {
      success: true,
      marketRequest: updated,
    };
  });

  // Get user's own market requests
  fastify.get('/my-requests', { preHandler: [requireAuth] }, async (request) => {
    const userId = request.user!.id;

    const requests = await prisma.marketRequest.findMany({
      where: { requestedBy: userId },
      include: {
        createdMarket: {
          select: {
            id: true,
            slug: true,
            question: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { requests };
  });

  // Get statistics (admin only)
  fastify.get('/admin/stats', { preHandler: [requireAuth, requireAdmin] }, async () => {
    const [pending, approved, rejected, created] = await Promise.all([
      prisma.marketRequest.count({ where: { status: 'PENDING' } }),
      prisma.marketRequest.count({ where: { status: 'APPROVED' } }),
      prisma.marketRequest.count({ where: { status: 'REJECTED' } }),
      prisma.marketRequest.count({ where: { status: 'CREATED' } }),
    ]);

    return {
      stats: {
        pending,
        approved,
        rejected,
        created,
        total: pending + approved + rejected + created,
      },
    };
  });
};

export default marketRequestsRoutes;
