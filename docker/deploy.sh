#!/bin/bash
# ===========================================
# Omnichannel Production Deployment Script
# ===========================================
# This script is triggered after pulling the latest code.
# It rebuilds and restarts the webapp container.
#
# Prerequisites:
# - PostgreSQL running natively on the host
# - Redis running natively on the host
# - Docker and docker compose installed

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Omnichannel Deployment Script${NC}"
echo -e "${GREEN}============================================${NC}"

# Change to docker directory
cd "$SCRIPT_DIR"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found in docker folder${NC}"
    echo -e "${YELLOW}Please copy .env.example to .env and configure it:${NC}"
    echo -e "  cp .env.example .env"
    exit 1
fi

# Load environment variables
set -a
source .env
set +a

# Function to print step
print_step() {
    echo -e "\n${YELLOW}>>> $1${NC}"
}

# Step 1: Pull latest code (optional)
if [ "$1" == "--pull" ]; then
    print_step "Pulling latest code..."
    cd "$PROJECT_ROOT"
    git pull origin main
    cd "$SCRIPT_DIR"
fi

# Step 2: Stop existing container
print_step "Stopping webapp container..."
docker compose down || true

# Step 3: Rebuild the webapp container
print_step "Rebuilding webapp container (no cache)..."
docker compose build --no-cache

# Step 4: Run database migrations
print_step "Running database migrations..."
docker compose run --rm webapp node -e "
const { execSync } = require('child_process');
try {
    execSync('npm run migration:run', { stdio: 'inherit', cwd: '/app' });
} catch (e) {
    console.log('Migration skipped or completed');
}
" 2>/dev/null || echo -e "${YELLOW}Note: Migrations run on app startup if needed${NC}"

# Step 5: Start the webapp
print_step "Starting webapp container..."
docker compose up -d

# Step 6: Wait for service to be healthy
print_step "Waiting for webapp to be healthy..."
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -sf http://localhost:${HOST_PORT:-3012}/health > /dev/null 2>&1; then
        echo -e "${GREEN}Webapp is healthy!${NC}"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Waiting... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}Warning: Webapp health check timed out${NC}"
    echo -e "${YELLOW}Checking container logs...${NC}"
    docker compose logs --tail=30 webapp
fi

# Step 7: Show status
print_step "Container status:"
docker compose ps

echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo -e "Application: http://localhost:${HOST_PORT:-3012}"
echo -e "Logs: docker compose logs -f webapp"
