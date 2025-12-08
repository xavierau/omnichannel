#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if pm2 is installed
if ! command -v pm2 &> /dev/null; then
    log_error "PM2 is not installed. Please install it with: npm install -g pm2"
    exit 1
fi

log_info "Starting deployment..."

# Step 1: Pull latest changes from GitHub (includes pre-built dist folders)
log_info "Pulling latest changes from GitHub..."
git pull origin "$(git rev-parse --abbrev-ref HEAD)"

# Step 2: Install frontend dependencies (production only)
log_info "Installing frontend dependencies..."
npm ci --omit=dev

# Step 3: Install backend dependencies (production only)
log_info "Installing backend dependencies..."
cd backend
npm ci --omit=dev

# Step 4: Run database migrations
log_info "Running database migrations..."
npm run migration:run

# Step 5: Return to root directory
cd "$SCRIPT_DIR"

# Step 6: Create logs directory if it doesn't exist
mkdir -p logs

# Step 7: Restart PM2
log_info "Restarting PM2 processes..."
if pm2 describe omnichannel-backend > /dev/null 2>&1; then
    pm2 reload ecosystem.config.cjs --env production
else
    pm2 start ecosystem.config.cjs --env production
fi

# Step 8: Save PM2 process list
pm2 save

log_info "Deployment completed successfully!"
log_info "View logs with: pm2 logs omnichannel-backend"
log_info "Check status with: pm2 status"