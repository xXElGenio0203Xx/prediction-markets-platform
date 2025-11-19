#!/bin/bash

# Start All Services Script
# This script starts both frontend and backend with auto-restart

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "🚀 Starting all services with auto-restart..."
echo ""
echo "📦 Docker services..."

# Check if Docker services are running
if ! docker ps | grep -q brunoexchange-postgres; then
  echo "⚠️  Starting Docker services..."
  docker compose -f backend/docker-compose.yml up -d
else
  echo "✅ Docker services already running"
fi

echo ""
echo "🔧 Starting backend in background..."
./start-backend.sh > logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait for backend to start
sleep 5

echo ""
echo "🎨 Starting frontend..."
echo "   This will run in the foreground. Press Ctrl+C to stop all services."
echo ""

# Trap Ctrl+C to clean up
trap "echo ''; echo '🛑 Stopping all services...'; kill $BACKEND_PID 2>/dev/null; exit" INT

./start-frontend.sh
