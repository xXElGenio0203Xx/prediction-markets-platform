// Error handling utilities
import type { FastifyReply } from 'fastify';

export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function sendError(reply: FastifyReply, error: any) {
  if (error instanceof AppError) {
    return reply.code(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }

  // Log unexpected errors
  console.error('Unexpected error:', error);

  return reply.code(500).send({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
