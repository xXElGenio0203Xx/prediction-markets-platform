// src/plugins/prisma.ts
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma Client with optimal settings for Supabase
const prismaClient = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

const prismaPlugin: FastifyPluginAsync = async (server) => {
  await prismaClient.$connect();
  server.log.info('Prisma connected to database');

  server.decorate('prisma', prismaClient);

  server.addHook('onClose', async (instance) => {
    instance.log.info('Disconnecting Prisma');
    await prismaClient.$disconnect();
  });
};

export default fp(prismaPlugin, {
  name: 'prisma',
});
