import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/middleware/auth.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.orderEvent.deleteMany();
  await prisma.trade.deleteMany();
  await prisma.order.deleteMany();
  await prisma.position.deleteMany();
  await prisma.transfer.deleteMany();
  await prisma.balance.deleteMany();
  await prisma.session.deleteMany();
  await prisma.market.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  const adminPasswordHash = await hashPassword('admin123456');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@browncast.com',
      passwordHash: adminPasswordHash,
      fullName: 'Admin User',
      role: 'ADMIN',
    },
  });

  console.log('✅ Created admin user:', admin.email);

  // Create test users
  const userPasswordHash = await hashPassword('password123');
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'alice@example.com',
        passwordHash: userPasswordHash,
        fullName: 'Alice Johnson',
        role: 'USER',
      },
    }),
    prisma.user.create({
      data: {
        email: 'bob@example.com',
        passwordHash: userPasswordHash,
        fullName: 'Bob Smith',
        role: 'USER',
      },
    }),
    prisma.user.create({
      data: {
        email: 'charlie@example.com',
        passwordHash: userPasswordHash,
        fullName: 'Charlie Brown',
        role: 'USER',
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} test users`);

  // Create balances
  await Promise.all([
    prisma.balance.create({
      data: {
        userId: admin.id,
        available: 100000,
        locked: 0,
        total: 100000,
      },
    }),
    ...users.map((user) =>
      prisma.balance.create({
        data: {
          userId: user.id,
          available: 10000,
          locked: 0,
          total: 10000,
        },
      })
    ),
  ]);

  console.log('✅ Created user balances');

  // Create markets
  const markets = [
    {
      slug: 'btc-100k-eoy-2025',
      question: 'Will Bitcoin reach $100,000 by end of 2025?',
      description:
        'This market resolves to YES if Bitcoin (BTC) trades at or above $100,000 USD on any major exchange (Coinbase, Binance, Kraken) at any point before midnight UTC on December 31, 2025. Otherwise resolves to NO.',
      category: 'CRYPTO',
      closeTime: new Date('2025-12-31T23:59:59Z'),
      resolveTime: new Date('2026-01-01T12:00:00Z'),
      featured: true,
      yesPrice: 0.65,
      noPrice: 0.35,
      volume24h: 15420,
      liquidity: 50000,
    },
    {
      slug: 'ai-agi-2026',
      question: 'Will AGI be achieved by end of 2026?',
      description:
        'This market resolves to YES if a major AI research organization (OpenAI, Anthropic, DeepMind, Meta AI) publicly announces the achievement of Artificial General Intelligence by December 31, 2026. AGI is defined as AI capable of performing any intellectual task a human can do.',
      category: 'TECH',
      closeTime: new Date('2026-12-31T23:59:59Z'),
      resolveTime: new Date('2027-01-01T12:00:00Z'),
      featured: true,
      yesPrice: 0.25,
      noPrice: 0.75,
      volume24h: 8950,
      liquidity: 30000,
    },
    {
      slug: 'us-recession-2025',
      question: 'Will the US enter recession in 2025?',
      description:
        'This market resolves to YES if the National Bureau of Economic Research (NBER) officially declares that the US economy entered a recession at any point during calendar year 2025. Resolution based on NBER announcement, regardless of timing.',
      category: 'ECONOMICS',
      closeTime: new Date('2025-12-31T23:59:59Z'),
      resolveTime: new Date('2026-06-30T12:00:00Z'),
      featured: true,
      yesPrice: 0.42,
      noPrice: 0.58,
      volume24h: 22100,
      liquidity: 75000,
    },
    {
      slug: 'spacex-mars-2026',
      question: 'Will SpaceX land humans on Mars by 2026?',
      description:
        'This market resolves to YES if SpaceX successfully lands human astronauts on the surface of Mars before December 31, 2026. The landing must be confirmed by SpaceX and independent verification.',
      category: 'SCIENCE',
      closeTime: new Date('2026-12-31T23:59:59Z'),
      resolveTime: new Date('2027-01-15T12:00:00Z'),
      featured: false,
      yesPrice: 0.08,
      noPrice: 0.92,
      volume24h: 3200,
      liquidity: 15000,
    },
    {
      slug: 'eth-pos-success',
      question: 'Will Ethereum maintain 99.9% uptime in 2025?',
      description:
        'This market resolves to YES if the Ethereum mainnet (post-merge PoS) maintains at least 99.9% uptime throughout 2025, with no outages exceeding 1 hour. Resolution based on blockchain data and validator metrics.',
      category: 'CRYPTO',
      closeTime: new Date('2025-12-31T23:59:59Z'),
      resolveTime: new Date('2026-01-05T12:00:00Z'),
      featured: false,
      yesPrice: 0.88,
      noPrice: 0.12,
      volume24h: 5600,
      liquidity: 20000,
    },
  ];

  const createdMarkets = await Promise.all(
    markets.map((market) =>
      prisma.market.create({
        data: {
          ...market,
          createdBy: admin.id,
          status: 'OPEN',
        },
      })
    )
  );

  console.log(`✅ Created ${createdMarkets.length} markets`);

  // Create some sample orders for the first market
  const btcMarket = createdMarkets[0];
  const [alice, bob] = users;

  const orders = await Promise.all([
    // Alice buys YES at 0.65
    prisma.order.create({
      data: {
        marketId: btcMarket.id,
        userId: alice.id,
        side: 'BUY',
        type: 'LIMIT',
        outcome: 'YES',
        price: 0.65,
        quantity: 100,
        filled: 0,
        status: 'OPEN',
      },
    }),
    // Bob buys YES at 0.63
    prisma.order.create({
      data: {
        marketId: btcMarket.id,
        userId: bob.id,
        side: 'BUY',
        type: 'LIMIT',
        outcome: 'YES',
        price: 0.63,
        quantity: 150,
        filled: 0,
        status: 'OPEN',
      },
    }),
    // Alice sells YES at 0.68
    prisma.order.create({
      data: {
        marketId: btcMarket.id,
        userId: alice.id,
        side: 'SELL',
        type: 'LIMIT',
        outcome: 'YES',
        price: 0.68,
        quantity: 50,
        filled: 0,
        status: 'OPEN',
      },
    }),
  ]);

  console.log(`✅ Created ${orders.length} sample orders`);

  // Create sample positions
  await Promise.all([
    prisma.position.create({
      data: {
        userId: alice.id,
        marketId: btcMarket.id,
        outcome: 'YES',
        quantity: 200,
        averagePrice: 0.64,
      },
    }),
    prisma.position.create({
      data: {
        userId: bob.id,
        marketId: btcMarket.id,
        outcome: 'NO',
        quantity: 150,
        averagePrice: 0.38,
      },
    }),
  ]);

  console.log('✅ Created sample positions');

  console.log('\n🎉 Seeding complete!\n');
  console.log('📝 Test accounts:');
  console.log('   Admin: admin@browncast.com / admin123456');
  console.log('   Alice: alice@example.com / password123');
  console.log('   Bob: bob@example.com / password123');
  console.log('   Charlie: charlie@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
