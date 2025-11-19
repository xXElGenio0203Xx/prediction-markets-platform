import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log('🌱 Seeding admin account and additional data...');

  // Create admin user
  const adminPasswordHash = await hashPassword('admin123');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@brunoexchange.com' },
    update: {},
    create: {
      email: 'admin@brunoexchange.com',
      passwordHash: adminPasswordHash,
      fullName: 'Admin User',
      handle: 'admin',
      role: 'ADMIN',
    },
  });

  // Create admin balance
  await prisma.balance.upsert({
    where: { userId: admin.id },
    update: { available: 10000, total: 10000, locked: 0 },
    create: {
      userId: admin.id,
      available: 10000,
      total: 10000,
      locked: 0,
    },
  });

  console.log('✅ Admin user created:');
  console.log('   Email: admin@brunoexchange.com');
  console.log('   Password: admin123');
  console.log('   Role: ADMIN');
  console.log('   Balance: $10,000');

  // Create regular users with different balances
  const regularUsers = [
    { email: 'alice@example.com', name: 'Alice Johnson', handle: 'alice', balance: 500 },
    { email: 'bob@example.com', name: 'Bob Smith', handle: 'bob', balance: 750 },
    { email: 'carol@example.com', name: 'Carol Williams', handle: 'carol', balance: 1200 },
    { email: 'david@example.com', name: 'David Brown', handle: 'david', balance: 300 },
    { email: 'eve@example.com', name: 'Eve Davis', handle: 'eve', balance: 890 },
  ];

  const userPasswordHash = await hashPassword('password123');

  for (const userData of regularUsers) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        passwordHash: userPasswordHash,
        fullName: userData.name,
        handle: userData.handle,
        role: 'USER',
      },
    });

    await prisma.balance.upsert({
      where: { userId: user.id },
      update: { available: userData.balance, total: userData.balance, locked: 0 },
      create: {
        userId: user.id,
        available: userData.balance,
        total: userData.balance,
        locked: 0,
      },
    });

    console.log(`✅ User created: ${userData.email} (Balance: $${userData.balance})`);
  }

  // Get all markets
  const markets = await prisma.market.findMany();

  if (markets.length > 0) {
    console.log(`\n📊 Found ${markets.length} markets, adding positions and orders...`);

    const allUsers = await prisma.user.findMany();

    // Create some sample positions for users
    const market1 = markets[0]; // US Recession market
    const market2 = markets[1]; // Bitcoin $100k market

    // Alice has positions in market 1 (YES shares)
    await prisma.position.upsert({
      where: {
        userId_marketId_outcome: {
          userId: allUsers[1].id,
          marketId: market1.id,
          outcome: 'YES',
        },
      },
      update: {},
      create: {
        userId: allUsers[1].id,
        marketId: market1.id,
        outcome: 'YES',
        quantity: 100,
        averagePrice: 0.42,
      },
    });

    // Bob has positions in market 1 (NO shares)
    await prisma.position.upsert({
      where: {
        userId_marketId_outcome: {
          userId: allUsers[2].id,
          marketId: market1.id,
          outcome: 'NO',
        },
      },
      update: {},
      create: {
        userId: allUsers[2].id,
        marketId: market1.id,
        outcome: 'NO',
        quantity: 150,
        averagePrice: 0.58,
      },
    });

    // Carol has positions in market 2 (YES shares - Bitcoin)
    await prisma.position.upsert({
      where: {
        userId_marketId_outcome: {
          userId: allUsers[3].id,
          marketId: market2.id,
          outcome: 'YES',
        },
      },
      update: {},
      create: {
        userId: allUsers[3].id,
        marketId: market2.id,
        outcome: 'YES',
        quantity: 200,
        averagePrice: 0.65,
      },
    });

    console.log('✅ Sample positions created');

    // Create some open orders
    await prisma.order.create({
      data: {
        userId: allUsers[1].id,
        marketId: market1.id,
        outcome: 'YES',
        side: 'BUY',
        type: 'LIMIT',
        price: 0.40,
        quantity: 50,
        filled: 0,
        status: 'OPEN',
      },
    });

    await prisma.order.create({
      data: {
        userId: allUsers[2].id,
        marketId: market2.id,
        outcome: 'NO',
        side: 'BUY',
        type: 'LIMIT',
        price: 0.38,
        quantity: 75,
        filled: 0,
        status: 'OPEN',
      },
    });

    console.log('✅ Sample open orders created');
  }

  console.log('\n✨ Database seeding complete!');
  console.log('\n🔑 Login credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('ADMIN ACCOUNT:');
  console.log('  Email: admin@brunoexchange.com');
  console.log('  Password: admin123');
  console.log('\nREGULAR USERS:');
  console.log('  Email: alice@example.com');
  console.log('  Password: password123');
  console.log('  (Same password for all: bob, carol, david, eve)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
