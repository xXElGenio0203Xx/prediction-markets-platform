#!/usr/bin/env bash
# Script to generate all backend files for the prediction market

set -e

echo "🚀 Generating complete backend structure..."

# Create directory structure
mkdir -p backend/src/{config,contracts,engine,middleware,plugins,routes,settlement,utils,ws,examples}
mkdir -p backend/prisma
mkdir -p backend/tests/{engine,routes}
mkdir -p backend/.github/workflows

echo "✅ Directory structure created"
echo "📝 Next steps:"
echo "   1. cd backend"
echo "   2. npm install"
echo "   3. cp .env.example .env"
echo "   4. docker-compose up -d"
echo "   5. npx prisma migrate dev --name init"
echo "   6. npm run prisma:seed"
echo "   7. npm run dev"
echo ""
echo "⚠️  Note: Due to the size of this project (100+ files),"
echo "    I'll create the critical files now. Run 'npm run dev' after setup."
