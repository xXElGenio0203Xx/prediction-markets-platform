#!/bin/bash

# Startup Repository Cleanup Script
# Run this before pushing to your new production repository

echo "🧹 Cleaning up references for production migration..."
echo ""

cd "$(dirname "$0")"

# 1. Update package.json names
echo "📦 Updating package names..."

# Root package.json
if [ -f "package.json" ]; then
    sed -i '' 's/"name": ".*"/"name": "your-startup-prediction-markets"/' package.json
    echo "  ✓ Updated root package.json"
fi

# Backend package.json
if [ -f "backend/package.json" ]; then
    sed -i '' 's/"name": ".*"/"name": "@your-startup\/backend"/' backend/package.json
    echo "  ✓ Updated backend/package.json"
fi

# 2. Update seed file (remove test credentials, use env vars)
echo ""
echo "🔐 Updating seed file..."
cat > backend/prisma/seed.ts.new << 'EOF'
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

  // Get admin credentials from environment
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@yourdomain.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeThisPassword123!';

  // Create admin user
  const adminPasswordHash = await hashPassword(adminPassword);
  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      fullName: 'Admin User',
      role: 'ADMIN',
    },
  });

  console.log('✅ Created admin user:', admin.email);
  console.log('⚠️  Remember to change the admin password in production!');

  // Rest of seed logic...
  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
EOF

# Backup original and replace
if [ -f "backend/prisma/seed.ts" ]; then
    cp backend/prisma/seed.ts backend/prisma/seed.ts.backup
    # Just inform user - don't auto-replace as it might break
    echo "  ✓ Backup created: backend/prisma/seed.ts.backup"
    echo "  ⚠️  Review backend/prisma/seed.ts.new and update manually"
fi

# 3. Update CI/CD workflows
echo ""
echo "🔄 Updating CI/CD workflows..."
if [ -f ".github/workflows/ci.yml" ]; then
    sed -i '' 's/browncast/your-startup/g' .github/workflows/ci.yml
    echo "  ✓ Updated .github/workflows/ci.yml"
fi

# 4. Create production .env.example files
echo ""
echo "📝 Creating production .env.example files..."

cat > .env.example << 'EOF'
# Frontend Configuration
VITE_API_URL=http://localhost:4000/api
VITE_WS_URL=ws://localhost:4000/ws
VITE_APP_NAME=YourStartup
VITE_APP_URL=http://localhost:5173
EOF
echo "  ✓ Created .env.example"

cat > backend/.env.example << 'EOF'
# Environment
NODE_ENV=development

# Server
PORT=4000
CORS_ORIGIN=http://localhost:5173

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/prediction_market
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/prediction_market

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secrets (Generate with: openssl rand -base64 32)
JWT_SECRET=CHANGE_THIS_IN_PRODUCTION
JWT_REFRESH_SECRET=CHANGE_THIS_TOO_IN_PRODUCTION
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=15m

# WebSocket
WS_HEARTBEAT_INTERVAL=15000
WS_IDLE_TIMEOUT=60000

# Matching Engine
MAX_PRICE_SLIPPAGE=0.10
PRICE_SCALE=4
SELF_TRADE_PREVENTION=true

# Logging
LOG_LEVEL=info

# Admin Credentials (for seeding)
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=ChangeThisPassword123!

# Optional: Error Tracking
SENTRY_DSN=
EOF
echo "  ✓ Created backend/.env.example"

# 5. Update documentation references
echo ""
echo "📚 Checking documentation..."
echo "  ⚠️  Please manually update:"
echo "     - HOW_TO_USE_THE_APP.md (replace test credentials)"
echo "     - README.md (update branding)"
echo "     - Any other docs with 'browncast' references"

# 6. Create LICENSE file
echo ""
echo "📜 Creating LICENSE file..."
cat > LICENSE << 'EOF'
Copyright (c) 2025 YourStartup Name

All rights reserved.

This software and associated documentation files (the "Software") are proprietary
and confidential. Unauthorized copying, distribution, or use of this Software,
via any medium, is strictly prohibited.

For licensing inquiries, please contact: legal@yourdomain.com
EOF
echo "  ✓ Created LICENSE"

# 7. Summary
echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Review all changes in git diff"
echo "  2. Manually update:"
echo "     - backend/prisma/seed.ts (use seed.ts.new as reference)"
echo "     - HOW_TO_USE_THE_APP.md (remove test credentials)"
echo "     - README.md (update branding)"
echo "     - LICENSE (add your company name)"
echo "  3. Update .env.example with your actual structure"
echo "  4. Generate strong JWT secrets:"
echo "     openssl rand -base64 32"
echo "  5. Commit all changes"
echo "  6. Push to your new repository"
echo ""
echo "📖 See STARTUP_MIGRATION_GUIDE.md for full instructions"
