#!/bin/bash

# Backend Auto-Restart Script
# This script monitors and automatically restarts the backend if it crashes

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

cd backend

echo "🚀 Starting backend with auto-restart enabled..."
echo "📍 Press Ctrl+C to stop"

while true; do
  echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting backend..."
  
  # Start the backend
  pnpm dev
  
  EXIT_CODE=$?
  
  if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Backend exited cleanly"
    break
  elif [ $EXIT_CODE -eq 130 ]; then
    # Exit code 130 is Ctrl+C
    echo "🛑 Stopped by user"
    break
  else
    echo "❌ Backend crashed with exit code $EXIT_CODE"
    echo "⏳ Restarting in 3 seconds..."
    sleep 3
  fi
done
