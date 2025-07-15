#!/bin/bash

# TimeMachine 2.0 Update Script
# Run this script to update the application with latest changes

set -e  # Exit on any error

# Configuration
APP_NAME="time2"
APP_DIR="/data/time2"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check if running from correct directory
if [ ! -d "$APP_DIR/.git" ]; then
    error "Please run this script from $APP_DIR (git repository)"
fi

# Change to app directory
cd "$APP_DIR"

# Pre-update checks
log "Performing pre-update checks..."

# Check if PM2 is running
if ! pm2 show "$APP_NAME" | grep -q "online"; then
    warn "Application is not running in PM2"
fi

# Backup current state
log "Creating backup..."
BACKUP_DIR="/var/backups/timemachine"
BACKUP_FILE="$BACKUP_DIR/update-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_FILE" --exclude=node_modules --exclude=.git . 2>/dev/null
log "Backup created: $BACKUP_FILE"

# Show current commit
log "Current commit: $(git rev-parse --short HEAD)"
log "Current branch: $(git branch --show-current)"

# Fetch latest changes
log "Fetching latest changes..."
git fetch origin

# Check if there are updates
if git status -uno | grep -q "Your branch is up to date"; then
    log "No updates available"
    exit 0
fi

# Show what will be updated
log "Available updates:"
git log --oneline HEAD..origin/$(git branch --show-current) | head -5

# Pull latest changes
log "Pulling latest changes..."
git pull

# Install/update dependencies
log "Updating dependencies..."
npm run install:all

# Build application
log "Building application..."
npm run build

# Restart application
log "Restarting application..."
pm2 restart "$APP_NAME"

# Wait for application to stabilize
log "Waiting for application to stabilize..."
sleep 5

# Health check
log "Performing health check..."
if ! curl -f http://localhost:3003/api/health &> /dev/null; then
    error "Health check failed after update. Check logs: pm2 logs $APP_NAME"
fi

# Show new commit
log "Updated to commit: $(git rev-parse --short HEAD)"

# Show PM2 status
log "Application status:"
pm2 show "$APP_NAME" | grep -E "(status|cpu|memory|uptime)"

log "Update completed successfully!"
log "View logs: pm2 logs $APP_NAME"
log "Monitor: pm2 monit"