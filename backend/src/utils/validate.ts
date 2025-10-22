// src/utils/validate.ts
import { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { z, ZodSchema } from 'zod';
import { AppError } from './errors.js';

export function validateBody<T>(schema: ZodSchema<T>): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.body = schema.parse(request.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new AppError('VALIDATION_ERROR', 400, 'Invalid request body', error.errors);
      }
      throw error;
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.query = schema.parse(request.query);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new AppError('VALIDATION_ERROR', 400, 'Invalid query parameters', error.errors);
      }
      throw error;
    }
  };
}

export function validateParams<T>(schema: ZodSchema<T>): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.params = schema.parse(request.params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new AppError('VALIDATION_ERROR', 400, 'Invalid path parameters', error.errors);
      }
      throw error;
    }
  };
}
