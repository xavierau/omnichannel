#!/bin/bash
# ===========================================
# Forge Deployment Script
# ===========================================
# Simple deploy script - dist folders are committed to repo.
# Forge just pulls and restarts.
#
# Usage in Forge Deploy Script:
# cd /home/forge/omnichannel.phbsolution.com
# bash scripts/forge-deploy.sh

set -e

SITE_PATH="/home/forge/omnichannel.phbsolution.com"

echo "=== Starting deployment ==="

# Pull latest code (includes pre-built dist folders)
cd "${SITE_PATH}"
git pull origin develop

# Install production dependencies for backend
echo "Installing backend production dependencies..."
cd "${SITE_PATH}/backend"
npm ci --production

# Restart the application with PM2
echo "Restarting application..."
pm2 restart omnichannel-backend 2>/dev/null || pm2 start dist/server.js --name omnichannel-backend

echo "=== Deployment complete ==="
