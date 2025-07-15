#!/bin/bash

# TimeMachine 2.0 Deployment Script
# Run this script on your Ubuntu server to deploy the application

set -e  # Exit on any error

# Configuration
APP_NAME="time2"
APP_DIR="/data/time2"
BACKUP_DIR="/var/backups/timemachine"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
PM2_LOG_DIR="/var/log/pm2"

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

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root. Use sudo when needed."
fi

# Check system requirements
check_requirements() {
    log "Checking system requirements..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js 18+ first."
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    if [ "$(printf '%s\n' "18.0.0" "$NODE_VERSION" | sort -V | head -n1)" != "18.0.0" ]; then
        error "Node.js version 18+ is required. Current version: $NODE_VERSION"
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
    fi
    
    # Check MongoDB
    if ! systemctl is-active --quiet mongod; then
        warn "MongoDB is not running. Please start MongoDB service."
    fi
    
    # Check nginx
    if ! command -v nginx &> /dev/null; then
        error "nginx is not installed"
    fi
    
    # Check PM2
    if ! command -v pm2 &> /dev/null; then
        log "Installing PM2..."
        npm install -g pm2
    fi
    
    log "System requirements check passed"
}

# Create necessary directories
create_directories() {
    log "Creating directories..."
    
    sudo mkdir -p "$APP_DIR"
    sudo mkdir -p "$BACKUP_DIR"
    sudo mkdir -p "$PM2_LOG_DIR"
    
    # Set ownership
    sudo chown -R $USER:$USER "$APP_DIR"
    sudo chown -R $USER:$USER "$BACKUP_DIR"
    sudo chown -R $USER:$USER "$PM2_LOG_DIR"
    
    log "Directories created"
}

# Backup existing installation
backup_existing() {
    if [ -d "$APP_DIR" ]; then
        log "Backing up existing installation..."
        BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz"
        sudo tar -czf "$BACKUP_FILE" -C "$APP_DIR" . 2>/dev/null || true
        log "Backup created: $BACKUP_FILE"
    fi
}

# Deploy application
deploy_app() {
    log "Deploying application to $APP_DIR..."
    
    # Check if this is a git repository
    if [ ! -d "$APP_DIR/.git" ]; then
        error "This script should be run from a git repository cloned to $APP_DIR"
    fi
    
    # Ensure we're in the app directory
    cd "$APP_DIR"
    
    # Pull latest changes
    log "Pulling latest changes..."
    git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || log "Git pull completed"
    
    # Install dependencies
    log "Installing dependencies..."
    npm run install:all
    
    # Build application
    log "Building application..."
    npm run build
    
    # Set up production environment
    log "Setting up production environment..."
    
    # Copy and configure environment file
    if [ ! -f "$APP_DIR/server/.env.production" ]; then
        cp "$APP_DIR/server/.env.example" "$APP_DIR/server/.env.production" 2>/dev/null || true
    fi
    
    # Generate JWT secret if not exists
    if ! grep -q "JWT_SECRET=" "$APP_DIR/server/.env.production" || grep -q "your-very-secure-random-jwt-secret-key-here" "$APP_DIR/server/.env.production"; then
        JWT_SECRET=$(openssl rand -base64 32)
        sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" "$APP_DIR/server/.env.production"
        log "Generated new JWT secret"
    fi
    
    log "Application deployed"
}

# Configure nginx
configure_nginx() {
    log "Configuring nginx..."
    
    # Copy nginx configuration
    cp "$APP_DIR/nginx.conf" "$NGINX_SITES_AVAILABLE/time2.bill.tt"
    
    # Create symbolic link if it doesn't exist
    if [ ! -L "$NGINX_SITES_ENABLED/time2.bill.tt" ]; then
        sudo ln -s "$NGINX_SITES_AVAILABLE/time2.bill.tt" "$NGINX_SITES_ENABLED/time2.bill.tt"
    fi
    
    # Test nginx configuration
    sudo nginx -t || error "nginx configuration test failed"
    
    log "nginx configured"
}

# Configure PM2
configure_pm2() {
    log "Configuring PM2..."
    
    cd "$APP_DIR"
    
    # Stop existing PM2 process if running
    pm2 stop "$APP_NAME" 2>/dev/null || true
    pm2 delete "$APP_NAME" 2>/dev/null || true
    
    # Start application with PM2
    pm2 start ecosystem.config.js --env production
    
    # Save PM2 configuration
    pm2 save
    
    # Set up PM2 to start on boot
    pm2 startup | tail -1 | sudo sh || warn "Could not set up PM2 startup script"
    
    log "PM2 configured"
}

# Health check
health_check() {
    log "Performing health check..."
    
    # Wait for application to start
    sleep 5
    
    # Check if PM2 process is running
    if ! pm2 show "$APP_NAME" | grep -q "online"; then
        error "Application is not running in PM2"
    fi
    
    # Check if application responds to health endpoint
    if ! curl -f http://localhost:3003/api/health &> /dev/null; then
        error "Application health check failed"
    fi
    
    log "Health check passed"
}

# Restart services
restart_services() {
    log "Restarting services..."
    
    # Reload nginx
    sudo systemctl reload nginx
    
    # Restart PM2 process
    pm2 restart "$APP_NAME"
    
    log "Services restarted"
}

# Main deployment process
main() {
    log "Starting TimeMachine 2.0 deployment..."
    
    check_requirements
    create_directories
    backup_existing
    deploy_app
    configure_nginx
    configure_pm2
    health_check
    restart_services
    
    log "Deployment completed successfully!"
    log "Application is running at: https://time2.bill.tt"
    log "API endpoint: https://time2.bill.tt/api"
    log "PM2 status: pm2 status"
    log "PM2 logs: pm2 logs $APP_NAME"
    log "nginx logs: sudo tail -f /var/log/nginx/time2.bill.tt.access.log"
    
    # Show status
    echo ""
    log "Current PM2 status:"
    pm2 status
}

# Run main function
main "$@"