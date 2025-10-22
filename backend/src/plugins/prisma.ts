// src/plugins/prisma.ts
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

const prismaClient = new PrismaClient({
  log: ['error', 'warn'],
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
