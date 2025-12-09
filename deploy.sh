#!/bin/bash

# Deploy script for Omnichannel application
# Usage:
#   ./deploy.sh              # Incremental update (migrations only)
#   ./deploy.sh --refresh    # Full reset (drop tables, migrate, reseed)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR"

# Database configuration (override with environment variables)
DB_NAME="${DATABASE_NAME:-omnichannel_db}"
DB_USER="${DATABASE_USER:-postgres}"
DB_PASSWORD="${DATABASE_PASSWORD:-password}"
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"

# Parse arguments
REFRESH_MODE=false
for arg in "$@"; do
    case $arg in
        --refresh)
            REFRESH_MODE=true
            shift
            ;;
        --help|-h)
            echo "Usage: ./deploy.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --refresh    Drop all tables and reseed (WARNING: destroys all data)"
            echo "  --help, -h   Show this help message"
            echo ""
            echo "Without options, performs incremental update (git pull, build, migrate)"
            exit 0
            ;;
    esac
done

echo -e "${GREEN}🚀 Starting deployment...${NC}"
echo ""

# Step 1: Pull latest code
echo -e "${YELLOW}📥 Pulling latest code...${NC}"
git pull origin develop

# Step 2: Install dependencies if package-lock changed
echo -e "${YELLOW}📦 Checking dependencies...${NC}"
cd "$BACKEND_DIR"
npm ci --prefer-offline 2>/dev/null || npm install

cd "$FRONTEND_DIR"
npm ci --prefer-offline 2>/dev/null || npm install

# Step 3: Build frontend
echo -e "${YELLOW}🏗️  Building frontend...${NC}"
cd "$FRONTEND_DIR"
npm run build

# Step 4: Build backend
echo -e "${YELLOW}🏗️  Building backend...${NC}"
cd "$BACKEND_DIR"
npm run build

# Step 5: Database operations
if [ "$REFRESH_MODE" = true ]; then
    echo ""
    echo -e "${RED}⚠️  REFRESH MODE: This will DELETE ALL DATA!${NC}"
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm

    if [ "$confirm" != "yes" ]; then
        echo -e "${YELLOW}Aborted.${NC}"
        exit 1
    fi

    echo -e "${YELLOW}🗑️  Dropping all tables...${NC}"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
    FOR r IN (SELECT typname FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid
              WHERE n.nspname = 'public' AND t.typtype = 'e') LOOP
        EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
    END LOOP;
END $$;
EOF

    echo -e "${GREEN}✅ All tables dropped${NC}"

    echo -e "${YELLOW}🔄 Running migrations...${NC}"
    npm run migration:run

    echo -e "${YELLOW}🌱 Seeding database...${NC}"
    npm run seed

    echo -e "${GREEN}✅ Database refreshed and seeded${NC}"
else
    echo -e "${YELLOW}🔄 Running migrations...${NC}"
    npm run migration:run
fi

# Step 6: Restart services
echo -e "${YELLOW}🔄 Restarting services...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 restart all 2>/dev/null || echo -e "${YELLOW}Note: No PM2 processes found${NC}"
else
    echo -e "${YELLOW}Note: PM2 not found. Restart your backend manually.${NC}"
fi

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"

if [ "$REFRESH_MODE" = true ]; then
    echo ""
    echo -e "${YELLOW}📝 Next: Register a new account to create your tenant and admin user.${NC}"
fi
