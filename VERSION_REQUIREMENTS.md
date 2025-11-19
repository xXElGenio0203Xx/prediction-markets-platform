# Version Requirements & Compatibility

## Minimum Requirements

### Docker & Docker Compose
- **Docker**: 20.10+ (released 2021 or later)
- **Docker Compose**: v2.0+ (included with Docker Desktop)

### Runtime & Package Manager
- **Node.js**: v20+ (LTS)
- **pnpm**: v9+

## Check Your System

Run these commands to verify your setup:

```bash
# Check Docker version (should be 20.10+)
docker --version

# Check Docker Compose version (should be v2.x)
docker compose version

# Check Node.js version (should be v20+)
node --version

# Check pnpm version (should be 9+)
pnpm --version
```

## Common Issues & Solutions

### 1. Docker Compose v1 vs v2

**Symptom**: Command `docker compose up -d` fails

**Cause**: Old systems use Docker Compose v1 (separate binary with hyphen)

**Solution**: Use the hyphenated command instead:
```bash
# v1 command (older systems)
docker-compose -f backend/docker-compose.yml up -d
docker-compose -f backend/docker-compose.yml down

# v2 command (newer systems - preferred)
docker compose -f backend/docker-compose.yml up -d
docker compose -f backend/docker-compose.yml down
```

**Recommendation**: Update to Docker Desktop which includes Compose v2

### 2. Very Old Docker (< 20.x)

**Symptom**: Compose file syntax errors

**Cause**: `docker-compose.yml` uses modern syntax not supported in Docker < 20.x

**Solution**: Update Docker to latest version
```bash
# macOS
brew upgrade --cask docker

# Or download from: https://www.docker.com/products/docker-desktop/
```

### 3. Architecture Differences (Intel vs Apple Silicon)

**Status**: ✅ No issues expected

**Why**: PostgreSQL and Redis images support both `amd64` (Intel) and `arm64` (Apple Silicon). Docker automatically pulls the correct architecture.

### 4. Node.js Version Issues

**Symptom**: Package installation or runtime errors

**Cause**: Node.js version < 20

**Solution**: Install Node 20 via nvm (recommended):
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.6/install.sh | bash

# Reload shell
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install and use Node 20
nvm install 20
nvm use 20
nvm alias default 20
```

### 5. pnpm Not Found

**Symptom**: `pnpm: command not found`

**Cause**: pnpm not installed or not enabled

**Solution**: Enable pnpm via Corepack (included with Node 16.13+):
```bash
corepack enable
corepack prepare pnpm@9 --activate
```

## Platform-Specific Notes

### macOS
- Docker Desktop is the standard installation method
- Works on both Intel and Apple Silicon Macs
- Requires macOS 11+ for best compatibility

### Linux
- Install Docker Engine + Docker Compose plugin
- Or use Docker Desktop for Linux (easier)
- May need to add user to docker group: `sudo usermod -aG docker $USER`

### Windows
- Use Docker Desktop with WSL2 backend
- Run development inside WSL2 Ubuntu for best results
- PowerShell commands may differ slightly

## Troubleshooting Checklist

If setup fails, verify:

1. **Docker is running**: Open Docker Desktop or check `docker ps`
2. **Ports are available**: Nothing else using 5173, 8080, 5433, 6380
3. **Node version**: Must be v20+, verify with `node --version`
4. **pnpm installed**: Run `pnpm --version` should show v9+
5. **Docker has resources**: At least 4GB RAM, 2 CPUs allocated in Docker Desktop settings
6. **No previous containers**: Run `docker ps -a` and remove old containers if needed

## Quick System Check Script

Run this to check everything at once:

```bash
echo "=== System Compatibility Check ==="
echo ""
echo "Docker version:"
docker --version
echo ""
echo "Docker Compose version:"
docker compose version 2>/dev/null || docker-compose --version
echo ""
echo "Node.js version:"
node --version
echo ""
echo "pnpm version:"
pnpm --version
echo ""
echo "=== Port Availability ==="
lsof -i :5173 >/dev/null 2>&1 && echo "⚠️  Port 5173 in use" || echo "✅ Port 5173 available"
lsof -i :8080 >/dev/null 2>&1 && echo "⚠️  Port 8080 in use" || echo "✅ Port 8080 available"
lsof -i :5433 >/dev/null 2>&1 && echo "⚠️  Port 5433 in use" || echo "✅ Port 5433 available"
lsof -i :6380 >/dev/null 2>&1 && echo "⚠️  Port 6380 in use" || echo "✅ Port 6380 available"
```

## Expected Output

When everything is correct:

```
Docker version 24.0.0 or higher
Docker Compose version v2.20.0 or higher
Node.js v20.x.x
pnpm 9.x.x
```

## Still Having Issues?

1. Check the [LOCALHOST_QUICKSTART.md](./LOCALHOST_QUICKSTART.md) for step-by-step setup
2. Verify Docker Desktop is running and has sufficient resources
3. Try restarting Docker Desktop
4. Clear Docker cache: `docker system prune -a`
5. Check the terminal output for specific error messages

## Updates

Last verified: November 19, 2025
- Docker: 24.0.0+
- Docker Compose: v2.20.0+
- Node.js: v20.19.5
- pnpm: v9.15.9
