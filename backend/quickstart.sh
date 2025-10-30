#!/usr/bin/env bash
# Quick Start Script for Backend Setup

set -e

echo "🚀 Prediction Market Backend - Quick Start"
echo "=========================================="
echo ""

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Are you in the /backend directory?"
    exit 1
fi

echo "📦 Step 1: Installing dependencies..."
npm install

echo ""
echo "🐳 Step 2: Starting Docker services (PostgreSQL + Redis)..."
docker-compose up -d db redis

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

echo ""
echo "🗄️ Step 3: Setting up database..."
if [ ! -f ".env" ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️  IMPORTANT: Edit .env and update JWT_SECRET and JWT_REFRESH_SECRET!"
fi

echo ""
echo "🔄 Running Prisma migrations..."
npx prisma generate
npx prisma migrate dev --name init

echo ""
echo "🌱 Step 4: Seeding database..."
npm run prisma:seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next Steps:"
echo "   1. Review MIGRATION_GUIDE.md for full migration strategy"
echo "   2. Use COPILOT_PROMPT.md with GitHub Copilot to generate remaining code"
echo "   3. Or run: npm run dev (if all source files are created)"
echo ""
echo "📚 Documentation:"
echo "   - API Docs: http://localhost:4000/docs (after starting server)"
echo "   - Health Check: http://localhost:4000/healthz"
echo "   - Prisma Studio: npm run prisma:studio"
echo ""
echo "🔧 Useful Commands:"
echo "   npm run dev              - Start development server"
echo "   npm test                 - Run tests"
echo "   npm run prisma:studio    - Open database GUI"
echo "   docker-compose logs -f   - View service logs"
echo ""
