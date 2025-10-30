#!/bin/bash

# ============================================================================
# ARCHITECTURE CONSISTENCY FIX SCRIPT
# ============================================================================
# This script applies the necessary schema changes to fix inconsistencies
# between Prisma schema and shared types package
#
# Usage: ./fix-architecture-consistency.sh
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║       ARCHITECTURE CONSISTENCY FIX SCRIPT                        ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# PREFLIGHT CHECKS
# ============================================================================

echo -e "${BLUE}[1/6] Running preflight checks...${NC}"
echo ""

# Check if we're in the project root
if [ ! -f "pnpm-workspace.yaml" ]; then
  echo -e "${RED}❌ Error: Must run from project root directory${NC}"
  echo "   Expected to find: pnpm-workspace.yaml"
  exit 1
fi

# Check if backend/prisma/schema.prisma exists
if [ ! -f "backend/prisma/schema.prisma" ]; then
  echo -e "${RED}❌ Error: backend/prisma/schema.prisma not found${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Preflight checks passed${NC}"
echo ""

# ============================================================================
# SHOW CHANGES
# ============================================================================

echo -e "${BLUE}[2/6] Changes to be applied:${NC}"
echo ""
echo "  📝 User Model:"
echo "     + Add 'handle' field (String?, unique)"
echo ""
echo "  📝 Market Model:"
echo "     + Add 'imageUrl' field (String?)"
echo "     + Add 'resolutionSource' field (String?)"
echo ""
echo "  ℹ️  All fields are optional (nullable) - backward compatible"
echo ""

# ============================================================================
# BACKUP
# ============================================================================

echo -e "${BLUE}[3/6] Creating backup...${NC}"
echo ""

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backend/prisma/schema.prisma.backup_${TIMESTAMP}"

cp backend/prisma/schema.prisma "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup created: ${BACKUP_FILE}${NC}"
echo ""

# ============================================================================
# CONFIRMATION
# ============================================================================

echo -e "${YELLOW}⚠️  This will modify your Prisma schema and create database migrations${NC}"
echo ""
read -p "Continue with changes? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo -e "${RED}❌ Operation cancelled by user${NC}"
  echo ""
  exit 0
fi

echo ""

# ============================================================================
# APPLY SCHEMA CHANGES
# ============================================================================

echo -e "${BLUE}[4/6] Applying schema changes...${NC}"
echo ""

# Create temporary file with new schema
TEMP_SCHEMA="backend/prisma/schema.prisma.tmp"
cp backend/prisma/schema.prisma "$TEMP_SCHEMA"

# Add handle field to User model (after passwordHash line)
echo "  📝 Adding User.handle field..."
if grep -q "handle.*String" "$TEMP_SCHEMA"; then
  echo -e "${YELLOW}     ⚠️  handle field already exists, skipping${NC}"
else
  # Use awk to add handle field after passwordHash
  awk '/passwordHash.*String/ { print; print "  handle       String?  @unique"; next }1' \
    "$TEMP_SCHEMA" > "${TEMP_SCHEMA}.new"
  mv "${TEMP_SCHEMA}.new" "$TEMP_SCHEMA"
  echo -e "${GREEN}     ✅ Added handle field${NC}"
fi

# Add imageUrl field to Market model (after question line)
echo "  📝 Adding Market.imageUrl field..."
if grep -q "imageUrl.*String" "$TEMP_SCHEMA"; then
  echo -e "${YELLOW}     ⚠️  imageUrl field already exists, skipping${NC}"
else
  awk '/question.*String$/ { print; print "  imageUrl     String?"; next }1' \
    "$TEMP_SCHEMA" > "${TEMP_SCHEMA}.new"
  mv "${TEMP_SCHEMA}.new" "$TEMP_SCHEMA"
  echo -e "${GREEN}     ✅ Added imageUrl field${NC}"
fi

# Add resolutionSource field to Market model (after resolveTime line)
echo "  📝 Adding Market.resolutionSource field..."
if grep -q "resolutionSource.*String" "$TEMP_SCHEMA"; then
  echo -e "${YELLOW}     ⚠️  resolutionSource field already exists, skipping${NC}"
else
  awk '/resolveTime.*DateTime/ { print; print "  resolutionSource String?"; next }1' \
    "$TEMP_SCHEMA" > "${TEMP_SCHEMA}.new"
  mv "${TEMP_SCHEMA}.new" "$TEMP_SCHEMA"
  echo -e "${GREEN}     ✅ Added resolutionSource field${NC}"
fi

# Replace original schema with modified version
mv "$TEMP_SCHEMA" backend/prisma/schema.prisma

echo ""
echo -e "${GREEN}✅ Schema changes applied${NC}"
echo ""

# ============================================================================
# VALIDATE SCHEMA
# ============================================================================

echo -e "${BLUE}[5/6] Validating schema...${NC}"
echo ""

cd backend
if pnpm prisma validate > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Schema is valid${NC}"
else
  echo -e "${RED}❌ Schema validation failed${NC}"
  echo ""
  echo "Restoring backup..."
  cp "$BACKUP_FILE" prisma/schema.prisma
  echo -e "${YELLOW}⚠️  Backup restored${NC}"
  exit 1
fi
cd ..

echo ""

# ============================================================================
# CREATE MIGRATION
# ============================================================================

echo -e "${BLUE}[6/6] Creating database migration...${NC}"
echo ""

cd backend

echo "Running: pnpm prisma migrate dev --name add_missing_fields"
echo ""

if pnpm prisma migrate dev --name add_missing_fields; then
  echo ""
  echo -e "${GREEN}✅ Migration created and applied successfully${NC}"
  echo ""
  echo "Generating Prisma client..."
  pnpm prisma generate > /dev/null 2>&1
  echo -e "${GREEN}✅ Prisma client generated${NC}"
else
  echo ""
  echo -e "${RED}❌ Migration failed${NC}"
  echo ""
  echo "Restoring backup..."
  cp "../$BACKUP_FILE" prisma/schema.prisma
  echo -e "${YELLOW}⚠️  Backup restored${NC}"
  cd ..
  exit 1
fi

cd ..

# ============================================================================
# SUCCESS SUMMARY
# ============================================================================

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                    ✅ SUCCESS                                    ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "Schema changes applied successfully!"
echo ""
echo "Fields added:"
echo "  ✅ User.handle (String?, unique)"
echo "  ✅ Market.imageUrl (String?)"
echo "  ✅ Market.resolutionSource (String?)"
echo ""
echo "Next steps:"
echo "  1. Update auth routes to handle 'handle' field"
echo "  2. Update market routes to include new fields"
echo "  3. Test registration with handle"
echo "  4. Test market creation with imageUrl"
echo ""
echo "Backup saved at: ${BACKUP_FILE}"
echo ""
echo "Documentation:"
echo "  📄 ARCHITECTURE_CONSISTENCY_REPORT.md    - Full analysis"
echo "  📄 SCHEMA_FIXES_PROPOSAL.md              - Implementation guide"
echo "  📄 ARCHITECTURE_CONSISTENCY_SUMMARY.md   - Quick reference"
echo "  📄 ARCHITECTURE_CONSISTENCY_VISUAL.md    - Visual reference"
echo ""
echo "To test the changes:"
echo "  cd backend"
echo "  pnpm dev"
echo ""
echo "  # In another terminal:"
echo "  curl -X POST http://localhost:8080/api/auth/register \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"email\":\"test@example.com\",\"password\":\"Test123!\",\"handle\":\"testuser\"}'"
echo ""
echo "Happy coding! 🚀"
echo ""
