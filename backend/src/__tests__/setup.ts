import { beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Setup test environment
  console.log('Setting up test environment...');
});

afterAll(async () => {
  // Cleanup
  await prisma.$disconnect();
  console.log('Test environment cleaned up');
});

beforeEach(async () => {
  // Clear all tables before each test
  await prisma.orderEvent.deleteMany();
  await prisma.trade.deleteMany();
  await prisma.order.deleteMany();
  await prisma.position.deleteMany();
  await prisma.transfer.deleteMany();
  await prisma.balance.deleteMany();
  await prisma.session.deleteMany();
  await prisma.market.deleteMany();
  await prisma.user.deleteMany();
});

export { prisma };
